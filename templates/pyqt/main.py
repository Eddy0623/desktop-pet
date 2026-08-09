#!/usr/bin/env python3
"""Desktop pet (PyQt6) — transparent, frameless, always-on-top.

Mirrors the Electron pet's state machine (idle / walk / drag / fall / react).
Single-image procedural animation by default; sprite-sheet mode if assets/pet.json exists.
"""
import json
import math
import os
import random
import sys

from PyQt6.QtCore import QElapsedTimer, QPointF, Qt, QTimer
from PyQt6.QtGui import QColor, QPainter, QPixmap
from PyQt6.QtWidgets import QApplication, QLabel, QMenu, QWidget

ASSETS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets")

WIN_W, WIN_H = 240, 260
DISPLAY = 160  # on-screen pet size (transform mode)
MOVE_THRESHOLD = 4
GRAVITY = 2000.0
BOUNCE_Y = -0.4
BOUNCE_X = 0.6
SETTLE_VY = 200.0
THROW_CLAMP = 800.0

BUBBLES = ["嗨~", "想睡觉了…", "摸摸我！", "今天也要加油", "(¦3[▓▓]",
           "咕咕咕", "在看什么？", "抱抱", "好困哦", "喵~", "汪！", "嘿嘿"]


class Pet(QWidget):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.Tool
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
        self.resize(WIN_W, WIN_H)

        # ---- assets ----
        self.src = QPixmap(os.path.join(ASSETS, "pet.png"))
        meta = os.path.join(ASSETS, "pet.json")
        self.sprite = json.load(open(meta, encoding="utf-8")) if os.path.exists(meta) else None
        self.frame = 0
        self.frame_clock = 0

        # ---- state ----
        self.state = "idle"
        self.dir = 1
        self.velx = 0.0
        self.vely = 0.0
        self.x = 0.0
        self.y = 0.0
        self.dragging = False
        self.drag_offset = QPointF()
        self.press_global = QPointF()
        self.last_drag_t = 0.0
        self.next_decision = 0
        self.react_until = 0

        screen = QApplication.primaryScreen().availableGeometry()
        self.work = screen
        self.floor_y = screen.y() + screen.height()
        self.x = screen.x() + screen.width() / 2 - WIN_W / 2
        self.y = self.floor_y - WIN_H
        self.move(int(self.x), int(self.y))

        # ---- speech bubble ----
        self.bubble = QLabel("", self)
        self.bubble.setStyleSheet(
            "background:#fff;color:#222;padding:6px 11px;border-radius:12px;"
            "font:13px system-ui,'PingFang SC','Microsoft YaHei',sans-serif;"
        )
        self.bubble.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.bubble.hide()
        self.bubble_until = 0

        # ---- clock + loop ----
        self._et = QElapsedTimer()
        self._et.start()
        self.last = self._now()
        self.next_decision = self._now() + 2000 + random.random() * 3000

        self.timer = QTimer(self)
        self.timer.timeout.connect(self.tick)
        self.timer.start(16)  # ~60 fps

    # ---------- time ----------
    def _now(self) -> float:
        return self._et.elapsed()

    # ---------- painting ----------
    def paintEvent(self, _event) -> None:
        p = QPainter(self)
        p.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        now = self._now()
        t = now / 1000.0

        # ground shadow (drawn first, in window coords)
        off = max(0.0, (self.floor_y - WIN_H) - self.y)
        s = max(0.4, min(1.0, 1 - off / 500.0))
        p.setOpacity(0.3 * s)
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QColor(0, 0, 0, 120))
        p.drawEllipse(QPointF(WIN_W / 2, WIN_H - 4), 65 * s, 11 * s)
        p.setOpacity(1.0)

        cx, base = WIN_W / 2, WIN_H - 6

        if self.sprite:
            defn = self.sprite["states"].get(self.state) or self.sprite["states"].get("idle")
            frames = defn["frames"] if defn else [0]
            row = defn["row"] if defn and "row" in defn else (1 if self.state == "walk" else 0)
            col = frames[self.frame % len(frames)]
            fw, fh = self.sprite["frameW"], self.sprite["frameH"]
            frame_pm = self.src.copy(col * fw, row * fh, fw, fh)
            scaled = frame_pm.scaled(
                DISPLAY, DISPLAY,
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation,
            )
            p.translate(cx, base)
            p.scale(self.dir, 1)
            p.drawPixmap(-scaled.width() / 2, -scaled.height(), scaled)
            return

        # ---- transform mode ----
        breathe = math.sin(t * 1.8) * 0.03
        sx = 1 - breathe * 0.5
        sy = 1 + breathe
        ty = 0.0
        rot = 0.0

        if self.state == "walk":
            ty = -abs(math.sin(t * 9)) * 7
            rot = math.sin(t * 9) * 3 * self.dir
        elif self.state == "idle":
            ty = math.sin(t * 1.8) * -3
            rot = math.sin(t * 0.7) * 1.5
        elif self.state == "drag":
            rot = max(-12, min(12, self.velx * 0.8))

        if now < self.react_until:
            k = (self.react_until - now) / 500.0
            sy *= 1 - 0.18 * k
            sx *= 1 + 0.18 * k

        pm = self.src.scaled(
            DISPLAY, DISPLAY,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
        if self.dir < 0:
            sx = -abs(sx)

        p.translate(cx, base)
        p.scale(sx, sy)
        p.rotate(rot)
        p.drawPixmap(int(-pm.width() / 2), int(-pm.height() + ty), pm)

    # ---------- update loop ----------
    def tick(self) -> None:
        now = self._now()
        dt = min(0.05, (now - self.last) / 1000.0)
        self.last = now

        self._decide(now)
        self._update(dt, now)

        if self.sprite:
            self._advance_frame()

        if self.bubble_until and now > self.bubble_until:
            self.bubble.hide()
            self.bubble_until = 0

        self.move(int(self.x), int(self.y))
        self.update()

    def _decide(self, now: float) -> None:
        if now < self.next_decision:
            return
        self.next_decision = now + 2000 + random.random() * 4000
        if self.state == "idle":
            if random.random() < 0.6:
                self.state = "walk"
                self.dir = -1 if random.random() < 0.5 else 1
                self.velx = self.dir * (40 + random.random() * 40)
        elif self.state == "walk":
            if random.random() < 0.5:
                self._to_idle()
            else:
                self.dir = -self.dir
                self.velx = self.dir * (40 + random.random() * 40)

    def _update(self, dt: float, now: float) -> None:
        if self.state == "walk":
            self.x += self.velx * dt
            min_x = self.work.x()
            max_x = self.work.x() + self.work.width() - WIN_W
            if self.x <= min_x:
                self.x = min_x
                self.dir = 1
                self.velx = abs(self.velx)
            elif self.x >= max_x:
                self.x = max_x
                self.dir = -1
                self.velx = -abs(self.velx)
            self.y = self.floor_y - WIN_H
        elif self.state == "fall":
            self.vely += GRAVITY * dt
            self.x += self.velx * dt
            self.y += self.vely * dt
            if self.y >= self.floor_y - WIN_H:
                self.y = self.floor_y - WIN_H
                if abs(self.vely) < SETTLE_VY:
                    self.velx = self.vely = 0.0
                    self._to_idle()
                else:
                    self.vely *= BOUNCE_Y
                    self.velx *= BOUNCE_X
                    self.react_until = now + 200
        elif self.state == "idle":
            self.y = self.floor_y - WIN_H
            self.velx = 0.0

    def _advance_frame(self) -> None:
        fps = self.sprite.get("fps", 8)
        every = max(1, round(60 / fps))
        self.frame_clock += 1
        if self.frame_clock >= every:
            self.frame_clock = 0
            self.frame += 1

    def _to_idle(self) -> None:
        self.state = "idle"
        self.y = self.floor_y - WIN_H
        self.velx = 0.0
        self.vely = 0.0

    # ---------- interaction ----------
    def mousePressEvent(self, e) -> None:
        if e.button() != Qt.MouseButton.LeftButton:
            return
        self.state = "drag"
        self.dragging = False
        self.press_global = e.globalPosition()
        self.drag_offset = e.globalPosition() - QPointF(self.x, self.y)
        self.last_drag_t = self._now()
        self.velx = self.vely = 0.0

    def mouseMoveEvent(self, e) -> None:
        if self.state != "drag":
            return
        g = e.globalPosition()
        nx = g.x() - self.drag_offset.x()
        ny = g.y() - self.drag_offset.y()
        if (abs(g.x() - self.press_global.x()) + abs(g.y() - self.press_global.y())) > MOVE_THRESHOLD:
            self.dragging = True
        if not self.dragging:
            return
        dt = max(1e-3, (self._now() - self.last_drag_t) / 1000.0)
        self.velx = max(-THROW_CLAMP, min(THROW_CLAMP, (nx - self.x) / dt))
        self.vely = (ny - self.y) / dt
        self.x, self.y = nx, ny
        self.last_drag_t = self._now()
        self.move(int(self.x), int(self.y))

    def mouseReleaseEvent(self, e) -> None:
        if self.state != "drag":
            return
        if not self.dragging:
            self.react()
            self._to_idle()
        elif self.y < self.floor_y - WIN_H - 4:
            self.state = "fall"
        else:
            self._to_idle()

    def contextMenuEvent(self, e) -> None:
        menu = QMenu(self)
        a_say = menu.addAction("说点什么")
        menu.addSeparator()
        a_quit = menu.addAction("退出")
        action = menu.exec(e.globalPos())
        if action == a_say:
            self.react()
        elif action == a_quit:
            QApplication.quit()

    # ---------- reactions ----------
    def react(self) -> None:
        self.react_until = self._now() + 500
        self.bubble.setText(random.choice(BUBBLES))
        self.bubble.adjustSize()
        self.bubble.move(WIN_W // 2 - self.bubble.width() // 2, WIN_H - DISPLAY - 36)
        self.bubble.show()
        self.bubble_until = self._now() + 1800


def main() -> None:
    app = QApplication(sys.argv)
    app.setApplicationName("desktop-pet")
    pet = Pet()
    pet.show()
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
