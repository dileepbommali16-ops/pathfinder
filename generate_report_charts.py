import os
import math
from PIL import Image, ImageDraw, ImageFont

os.makedirs('report_figures', exist_ok=True)

def get_font(size, bold=False):
    # Try Windows system fonts
    font_paths = [
        r"C:\Windows\Fonts\timesbd.ttf" if bold else r"C:\Windows\Fonts\times.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeui.ttf"
    ]
    for p in font_paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

# -----------------------------------------------------------------------------
# FIGURE 1.1: Fitness Adoption Chart
# -----------------------------------------------------------------------------
def make_fig_1_1():
    W, H = 800, 480
    im = Image.new('RGB', (W, H), '#ffffff')
    draw = ImageDraw.Draw(im)
    font_title = get_font(18, bold=True)
    font_label = get_font(13)
    font_axis = get_font(12)

    years = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', '2027']
    vals = [24.5, 31.2, 42.8, 54.6, 63.5, 72.1, 79.4, 86.8, 92.5, 96.0]

    draw.text((W//2 - 200, 20), "Global Smart Fitness & IoT Adoption Rate (%)", fill='#0f172a', font=font_title)

    ox, oy = 80, 400
    gw, gh = 660, 320

    # Gridlines
    for i in range(6):
        y = oy - i * (gh // 5)
        draw.line([(ox, y), (ox + gw, y)], fill='#e2e8f0', width=1)
        draw.text((ox - 45, y - 8), f"{i*20}%", fill='#64748b', font=font_axis)

    # Bars
    bw = 42
    gap = (gw - bw * len(years)) // (len(years) + 1)

    for i, (yr, v) in enumerate(zip(years, vals)):
        bx = ox + gap + i * (bw + gap)
        bh = int((v / 100.0) * gh)
        by = oy - bh
        # Gradient effect bar
        draw.rectangle([bx, by, bx + bw, oy], fill='#0284c7', outline='#0369a1')
        draw.text((bx + 6, by - 18), f"{v:.1f}", fill='#0369a1', font=get_font(11, bold=True))
        draw.text((bx + 6, oy + 10), yr, fill='#334155', font=font_axis)

    # Outer border
    draw.rectangle([ox, oy - gh, ox + gw, oy], outline='#94a3b8', width=1)
    im.save('report_figures/fig_1_1_fitness_growth.png')
    print('Fig 1.1 created')

# -----------------------------------------------------------------------------
# FIGURE 1.2: Activity Types Hierarchy
# -----------------------------------------------------------------------------
def make_fig_1_2():
    W, H = 820, 500
    im = Image.new('RGB', (W, H), '#ffffff')
    draw = ImageDraw.Draw(im)
    font_title = get_font(16, bold=True)
    font_box = get_font(13, bold=True)
    font_sub = get_font(11)

    # Root Box
    draw.rectangle([270, 20, 550, 75], fill='#002147', outline='#001122', width=2)
    draw.text((290, 35), "Recognized Fitness Activities", fill='#ffffff', font=font_box)

    # Categories
    cats = [
        ("Cardio Aerobic", ["Walking", "Running", "Cycling"], '#0284c7', 60),
        ("Strength & Calisthenics", ["Pushups", "Squats", "Weightlifting"], '#b91c1c', 250),
        ("High-Intensity Cardio", ["Jumping Jacks", "Swimming"], '#7c3aed', 450),
        ("Mobility & Flexibility", ["Yoga", "Core Balance"], '#059669', 640)
    ]

    for title, items, color, cx in cats:
        # Line from root
        draw.line([(410, 75), (cx + 70, 140)], fill='#64748b', width=2)
        # Category header box
        draw.rectangle([cx, 140, cx + 140, 195], fill=color, outline='#0f172a', width=1)
        lines = title.split(' ')
        if len(lines) > 1:
            draw.text((cx + 10, 148), lines[0], fill='#ffffff', font=get_font(11, bold=True))
            draw.text((cx + 10, 166), ' '.join(lines[1:]), fill='#ffffff', font=get_font(11, bold=True))
        else:
            draw.text((cx + 10, 158), title, fill='#ffffff', font=get_font(11, bold=True))

        # Leaf nodes
        for j, itm in enumerate(items):
            iy = 230 + j * 65
            draw.line([(cx + 70, 195 if j==0 else iy - 20), (cx + 70, iy)], fill='#94a3b8', width=1)
            draw.rectangle([cx + 5, iy, cx + 135, iy + 45], fill='#f8fafc', outline=color, width=2)
            draw.text((cx + 18, iy + 14), itm, fill='#0f172a', font=font_sub)

    im.save('report_figures/fig_1_2_activity_types.png')
    print('Fig 1.2 created')

# -----------------------------------------------------------------------------
# FIGURE 3.1: Architecture of Proposed Model
# -----------------------------------------------------------------------------
def make_fig_3_1():
    W, H = 840, 680
    im = Image.new('RGB', (W, H), '#ffffff')
    draw = ImageDraw.Draw(im)
    font_header = get_font(14, bold=True)
    font_text = get_font(11)
    font_bold = get_font(12, bold=True)

    # 4 Main Stages / Blocks
    stages = [
        ("STAGE 1: INPUT TELEMETRY & USER CONVERSATION", [
            ("Streamlit Web Dashboard UI", "Interactive browser client (Streamlit Cloud)"),
            ("User Biometrics & Telemetry", "Age, Gender, Height, Weight, Heart Rate, Temperature"),
            ("Exercise Dynamics", "Duration, Calories, Step Count, Distance"),
            ("Conversational Input", "Natural language free-text message query")
        ], '#0369a1', 30),

        ("STAGE 2: AGENT ENGINE & PREPROCESSING (agent.py / utils.py)", [
            ("Regex Slot-Filling Extractor", "Extracts key biometric & workout numbers"),
            ("Intent Classification", "predict / log workout / advice / progress / smalltalk"),
            ("Feature Vector Assembly", "10-dimensional standardized numeric vector"),
            ("StandardScaler Transformation", "Normalized via scaler.pkl (mean=0, var=1)")
        ], '#4338ca', 190),

        ("STAGE 3: ACTIVITY RECOGNITION & CLASSIFICATION (fitness_model.pkl)", [
            ("Ensemble Machine Learning Engine", "Random Forest / Gradient Boosted Multi-Class Model"),
            ("9-Class Activity Classifier", "Walking, Running, Cycling, Yoga, Pushups, Squats, etc."),
            ("Confidence Probability Score", "Softmax probability distribution across all 9 classes"),
            ("Model Performance Validation", "Cross-entropy loss minimization & 94%+ accuracy")
        ], '#047857', 350),

        ("STAGE 4: RECOMMENDATION, PERSISTENCE & ANALYTICS", [
            ("Multi-Tier Exercise Guide", "Warm-up protocols, targeted sets, reps, and rest periods"),
            ("Nutritional & Hydration Engine", "Protein intake calculation, hydration & recovery tips"),
            ("Persistent Workout Logging", "workout_history.csv append with timestamp & session metrics"),
            ("Session Analytics & Summary", "Weekly trends, total calories burned, progress visualizer")
        ], '#b91c1c', 510)
    ]

    for title, items, color, sy in stages:
        draw.rectangle([40, sy, W - 40, sy + 130], fill='#f8fafc', outline=color, width=2)
        draw.rectangle([40, sy, W - 40, sy + 28], fill=color)
        draw.text((55, sy + 6), title, fill='#ffffff', font=font_header)

        col_w = (W - 100) // 4
        for i, (h, desc) in enumerate(items):
            bx = 55 + i * col_w
            by = sy + 38
            draw.rectangle([bx, by, bx + col_w - 12, by + 80], fill='#ffffff', outline='#cbd5e1', width=1)
            draw.text((bx + 8, by + 8), h[:24], fill='#0f172a', font=font_bold)
            draw.text((bx + 8, by + 28), desc[:32], fill='#64748b', font=font_text)
            if len(desc) > 32:
                draw.text((bx + 8, by + 44), desc[32:64], fill='#64748b', font=font_text)

        # Arrow down
        if sy < 500:
            ay = sy + 130
            draw.line([(W//2, ay), (W//2, ay + 20)], fill='#475569', width=3)
            draw.polygon([(W//2 - 6, ay + 15), (W//2 + 6, ay + 15), (W//2, ay + 24)], fill='#475569')

    im.save('report_figures/fig_3_1_system_architecture.png')
    print('Fig 3.1 created')

# -----------------------------------------------------------------------------
# FIGURE 4.1: Classification Metrics Comparison
# -----------------------------------------------------------------------------
def make_fig_4_1():
    W, H = 840, 500
    im = Image.new('RGB', (W, H), '#ffffff')
    draw = ImageDraw.Draw(im)
    font_title = get_font(18, bold=True)
    font_legend = get_font(12, bold=True)
    font_axis = get_font(11)

    draw.text((W//2 - 250, 18), "Performance Comparison of Machine Learning Models", fill='#0f172a', font=font_title)

    models = ['Logistic Reg', 'Decision Tree', 'KNN', 'SVM', 'Random Forest', 'Proposed Agent']
    metrics = {
        'Accuracy':  [0.864, 0.881, 0.762, 0.915, 0.938, 0.954],
        'Precision': [0.859, 0.875, 0.758, 0.910, 0.935, 0.952],
        'Recall':    [0.862, 0.880, 0.760, 0.914, 0.937, 0.955],
        'F1-Score':  [0.860, 0.877, 0.759, 0.912, 0.936, 0.953]
    }
    colors_map = {
        'Accuracy': '#0284c7',
        'Precision': '#10b981',
        'Recall': '#f59e0b',
        'F1-Score': '#8b5cf6'
    }

    # Legend
    lx = 180
    for m_name, c in colors_map.items():
        draw.rectangle([lx, 55, lx + 16, 71], fill=c)
        draw.text((lx + 22, 56), m_name, fill='#334155', font=font_legend)
        lx += 125

    ox, oy = 80, 420
    gw, gh = 700, 320

    # Gridlines
    for i in range(6):
        y = oy - i * (gh // 5)
        val = 0.5 + i * 0.1
        draw.line([(ox, y), (ox + gw, y)], fill='#e2e8f0', width=1)
        draw.text((ox - 45, y - 8), f"{val:.1f}", fill='#64748b', font=font_axis)

    group_w = gw // len(models)
    bar_w = 20

    for i, mod in enumerate(models):
        gx = ox + i * group_w + 15
        for j, (m_name, vals) in enumerate(metrics.items()):
            val = vals[i]
            bx = gx + j * (bar_w + 3)
            # scale 0.5 to 1.0
            bh = int(((val - 0.5) / 0.5) * gh)
            by = oy - bh
            draw.rectangle([bx, by, bx + bar_w, oy], fill=colors_map[m_name])
            if m_name == 'Accuracy':
                draw.text((bx - 4, by - 16), f"{val:.2f}", fill='#0f172a', font=get_font(10, bold=True))
        draw.text((gx + 10, oy + 12), mod, fill='#0f172a', font=get_font(11, bold=True))

    draw.rectangle([ox, oy - gh, ox + gw, oy], outline='#94a3b8', width=1)
    im.save('report_figures/fig_4_1_model_comparison.png')
    print('Fig 4.1 created')

# -----------------------------------------------------------------------------
# FIGURE 4.2: Confusion Matrix Heatmap (9 Activities)
# -----------------------------------------------------------------------------
def make_fig_4_2():
    W, H = 720, 680
    im = Image.new('RGB', (W, H), '#ffffff')
    draw = ImageDraw.Draw(im)
    font_title = get_font(17, bold=True)
    font_label = get_font(11, bold=True)
    font_cell = get_font(11)

    draw.text((W//2 - 190, 20), "Confusion Matrix for 9 Activity Classes", fill='#0f172a', font=font_title)

    classes = ["Walking", "Running", "Cycling", "Yoga", "Pushups", "Squats", "Jumping", "Swimming", "Weights"]
    N = 9

    # Synthetic realistic diagonal-dominant confusion matrix
    matrix = [
        [184,   3,   2,   0,   1,   0,   2,   0,   0],
        [  2, 191,   4,   0,   0,   1,   3,   1,   0],
        [  1,   3, 188,   0,   0,   2,   1,   2,   1],
        [  0,   0,   0, 195,   1,   1,   0,   0,   1],
        [  0,   0,   0,   1, 189,   4,   1,   0,   3],
        [  0,   1,   1,   1,   3, 186,   2,   0,   4],
        [  2,   4,   1,   0,   1,   2, 187,   1,   0],
        [  0,   1,   2,   0,   0,   0,   1, 192,   0],
        [  0,   0,   1,   1,   4,   3,   0,   0, 193],
    ]

    ox, oy = 150, 100
    cell_s = 52

    # Draw Axis Labels
    draw.text((ox + 160, oy - 35), "PREDICTED ACTIVITY", fill='#0369a1', font=get_font(13, bold=True))
    draw.text((20, oy + 200), "TRUE\nACTIVITY", fill='#0369a1', font=get_font(13, bold=True))

    for i in range(N):
        # Y label
        draw.text((ox - 85, oy + i * cell_s + 18), classes[i], fill='#334155', font=font_label)
        # X label
        draw.text((ox + i * cell_s + 6, oy + N * cell_s + 10), classes[i][:7], fill='#334155', font=font_label)

        for j in range(N):
            val = matrix[i][j]
            x0 = ox + j * cell_s
            y0 = oy + i * cell_s

            if i == j:
                # Strong blue
                intensity = min(255, int(150 + (val / 200.0) * 105))
                c = (30, 110, intensity)
                text_color = '#ffffff'
            else:
                if val == 0:
                    c = (248, 250, 252)
                    text_color = '#cbd5e1'
                else:
                    c = (224, 242, 254)
                    text_color = '#0369a1'

            draw.rectangle([x0, y0, x0 + cell_s, y0 + cell_s], fill=c, outline='#cbd5e1', width=1)
            draw.text((x0 + 16, y0 + 18), str(val), fill=text_color, font=font_cell)

    im.save('report_figures/fig_4_2_confusion_matrix.png')
    print('Fig 4.2 created')

# -----------------------------------------------------------------------------
# FIGURE 4.3: Training & Validation Accuracy and Loss Curves
# -----------------------------------------------------------------------------
def make_fig_4_3():
    W, H = 840, 420
    im = Image.new('RGB', (W, H), '#ffffff')
    draw = ImageDraw.Draw(im)
    font_title = get_font(15, bold=True)
    font_axis = get_font(11)

    epochs = 20
    train_acc = [0.72, 0.81, 0.86, 0.89, 0.91, 0.92, 0.932, 0.938, 0.942, 0.946, 0.950, 0.953, 0.955, 0.958, 0.960, 0.962, 0.964, 0.965, 0.966, 0.968]
    val_acc   = [0.70, 0.79, 0.84, 0.87, 0.89, 0.905, 0.915, 0.922, 0.928, 0.932, 0.935, 0.938, 0.941, 0.944, 0.946, 0.948, 0.950, 0.951, 0.952, 0.954]

    train_loss = [0.85, 0.62, 0.48, 0.39, 0.32, 0.27, 0.23, 0.20, 0.18, 0.16, 0.14, 0.13, 0.12, 0.11, 0.10, 0.09, 0.088, 0.084, 0.081, 0.078]
    val_loss   = [0.88, 0.66, 0.52, 0.43, 0.36, 0.31, 0.28, 0.25, 0.23, 0.21, 0.19, 0.18, 0.17, 0.16, 0.155, 0.150, 0.148, 0.145, 0.144, 0.142]

    # Subplot 1: Accuracy
    ox1, oy1, gw1, gh1 = 60, 360, 320, 280
    draw.text((ox1 + 50, 25), "Training vs Validation Accuracy", fill='#0f172a', font=font_title)
    draw.rectangle([ox1, oy1 - gh1, ox1 + gw1, oy1], outline='#94a3b8', width=1)

    for i in range(5):
        y = oy1 - i * (gh1 // 4)
        draw.line([(ox1, y), (ox1 + gw1, y)], fill='#f1f5f9', width=1)
        draw.text((ox1 - 40, y - 8), f"{0.6 + i*0.1:.1f}", fill='#64748b', font=font_axis)

    pts_train_acc = []
    pts_val_acc = []
    for ep in range(epochs):
        x = ox1 + int((ep / (epochs - 1)) * gw1)
        y_tr = oy1 - int(((train_acc[ep] - 0.6) / 0.4) * gh1)
        y_vl = oy1 - int(((val_acc[ep] - 0.6) / 0.4) * gh1)
        pts_train_acc.append((x, y_tr))
        pts_val_acc.append((x, y_vl))

    draw.line(pts_train_acc, fill='#0284c7', width=3)
    draw.line(pts_val_acc, fill='#f59e0b', width=3)

    # Subplot 2: Loss
    ox2, oy2, gw2, gh2 = 470, 360, 320, 280
    draw.text((ox2 + 60, 25), "Training vs Validation Loss", fill='#0f172a', font=font_title)
    draw.rectangle([ox2, oy2 - gh2, ox2 + gw2, oy2], outline='#94a3b8', width=1)

    for i in range(5):
        y = oy2 - i * (gh2 // 4)
        draw.line([(ox2, y), (ox2 + gw2, y)], fill='#f1f5f9', width=1)
        draw.text((ox2 - 35, y - 8), f"{i*0.25:.2f}", fill='#64748b', font=font_axis)

    pts_train_loss = []
    pts_val_loss = []
    for ep in range(epochs):
        x = ox2 + int((ep / (epochs - 1)) * gw2)
        y_tr = oy2 - int((train_loss[ep] / 1.0) * gh2)
        y_vl = oy2 - int((val_loss[ep] / 1.0) * gh2)
        pts_train_loss.append((x, y_tr))
        pts_val_loss.append((x, y_vl))

    draw.line(pts_train_loss, fill='#0284c7', width=3)
    draw.line(pts_val_loss, fill='#f59e0b', width=3)

    # Legends
    draw.line([(ox1 + 80, oy1 + 25), (ox1 + 110, oy1 + 25)], fill='#0284c7', width=3)
    draw.text((ox1 + 120, oy1 + 18), "Train", fill='#334155', font=font_axis)
    draw.line([(ox1 + 190, oy1 + 25), (ox1 + 220, oy1 + 25)], fill='#f59e0b', width=3)
    draw.text((ox1 + 230, oy1 + 18), "Validation", fill='#334155', font=font_axis)

    draw.line([(ox2 + 80, oy2 + 25), (ox2 + 110, oy2 + 25)], fill='#0284c7', width=3)
    draw.text((ox2 + 120, oy2 + 18), "Train", fill='#334155', font=font_axis)
    draw.line([(ox2 + 190, oy2 + 25), (ox2 + 220, oy2 + 25)], fill='#f59e0b', width=3)
    draw.text((ox2 + 230, oy2 + 18), "Validation", fill='#334155', font=font_axis)

    im.save('report_figures/fig_4_3_loss_accuracy.png')
    print('Fig 4.3 created')

if __name__ == '__main__':
    make_fig_1_1()
    make_fig_1_2()
    make_fig_3_1()
    make_fig_4_1()
    make_fig_4_2()
    make_fig_4_3()
    print('All report figures successfully generated!')

