from flask import Flask, request, jsonify, render_template
import pandas as pd
from datetime import datetime , timedelta
import matplotlib
matplotlib.use('Agg')  # Use Anti-Grain Geometry backend for image generation
import matplotlib.pyplot as plt
from io import BytesIO
from flask import Response

import json
GOAL_FILE = 'goals.json'

app = Flask(__name__)
DATA_FILE = 'habits.csv'

# Initialize CSV
try:
    pd.read_csv(DATA_FILE)
except FileNotFoundError:
    pd.DataFrame(columns=["date", "habit", "duration"]).to_csv(DATA_FILE, index=False)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/log", methods=["POST"])
def log_habit():
    data = request.get_json()
    new_entry = {
        "date": datetime.today().strftime('%Y-%m-%d'),
        "habit": data["habit"],
        "duration": data["duration"]
    }
    df = pd.read_csv(DATA_FILE)
    df = pd.concat([df, pd.DataFrame([new_entry])], ignore_index=True)

    df.to_csv(DATA_FILE, index=False)
    return jsonify({"message": "Habit logged!"})



@app.route("/summary")
def weekly_summary():
    try:
        df = pd.read_csv(DATA_FILE)
        df["date"] = pd.to_datetime(df["date"])
        today = datetime.today()
        # Get the last 7 days (Mon-Sun)
        week_days = [today - timedelta(days=(today.weekday() - i) % 7) for i in range(7)]
        week_days = sorted([d.date() for d in week_days])
        habits = df["habit"].unique()
        summary = []
        for habit in habits:
            row = {"habit": habit}
            for i, day in enumerate(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]):
                date = week_days[i]
                mask = (df["habit"] == habit) & (df["date"].dt.date == date)
                row[day] = int(df.loc[mask, "duration"].sum()) if not df.loc[mask].empty else 0
            summary.append(row)
        return jsonify(summary)
    except Exception as e:
        print("Error generating summary:", e)
        return jsonify({"error": str(e)}), 500

try:
    with open(GOAL_FILE, 'r') as f:
        json.load(f)
except (FileNotFoundError, json.JSONDecodeError):
    with open(GOAL_FILE, 'w') as f:
        json.dump({}, f)

@app.route("/goals", methods=["GET", "POST", "PUT", "DELETE"])
def manage_goals():
    with open(GOAL_FILE, 'r') as f:
        goals = json.load(f)

    if request.method == "GET":
        return jsonify(goals)

    elif request.method == "POST":
        data = request.get_json()
        goals[data["habit"]] = data["target"]

    elif request.method == "PUT":
        data = request.get_json()
        goals[data["habit"]] = data["target"]

    elif request.method == "DELETE":
        data = request.get_json()
        habit = data["habit"]
        if habit in goals:
            del goals[habit]

    with open(GOAL_FILE, 'w') as f:
        json.dump(goals, f)
    return jsonify({"message": "Goals updated."})

@app.route("/trend.png")
def trend_chart():
    try:
        df = pd.read_csv(DATA_FILE)
        df["date"] = pd.to_datetime(df["date"])
        today = datetime.today()
        week_ago = today - timedelta(days=9)

        weekly = df[df["date"] >= week_ago]
        grouped = (
            weekly.groupby(["habit", "date"])["duration"]
            .sum()
            .unstack(fill_value=0)
        )

        fig, ax = plt.subplots(figsize=(8, 5))
        for habit in grouped.index:
            ax.plot(grouped.columns, grouped.loc[habit], marker='o', label=habit)

        ax.set_title("Habit Minutes Logged (Last 7 Days)")
        ax.set_xlabel("Date")
        ax.set_ylabel("Minutes")
        ax.legend()
        ax.grid(True)

        buf = BytesIO()
        fig.tight_layout()
        fig.savefig(buf, format="png")
        buf.seek(0)
        plt.close(fig)

        return Response(buf.getvalue(), mimetype="image/png")
    except Exception as e:
        print("Plot error:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/trend-data")
def trend_data():
    try:
        df = pd.read_csv(DATA_FILE)
        if df.empty:
            return jsonify({"labels": [], "datasets": []})
        df["date"] = pd.to_datetime(df["date"])
        today = datetime.today()
        week_ago = today - timedelta(days=6)
        weekly = df[df["date"] >= week_ago]
        # Get all dates in the last 7 days
        date_labels = [(today - timedelta(days=i)).date() for i in range(6, -1, -1)]
        date_labels_str = [d.strftime('%a') for d in date_labels]
        habits = weekly["habit"].unique()
        datasets = []
        for habit in habits:
            data = []
            for d in date_labels:
                mask = (weekly["habit"] == habit) & (weekly["date"].dt.date == d)
                data.append(int(weekly.loc[mask, "duration"].sum()) if not weekly.loc[mask].empty else 0)
            datasets.append({
                "label": habit,
                "data": data
            })
        return jsonify({"labels": date_labels_str, "datasets": datasets})
    except Exception as e:
        print("Error generating trend data:", e)
        return jsonify({"labels": [], "datasets": [], "error": str(e)})


if __name__ == "__main__":
    app.run(debug=True)
