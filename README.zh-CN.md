# desktop-pet

[English](README.md) | **中文**

一款 [Claude Code](https://claude.com/claude-code) **skill**：把任意一张图片变成会动的桌面宠物——一个透明、置顶、可拖动的小家伙，常驻在你的桌面上，会呼吸、会溜达，被丢出去后受重力下落弹跳，点它还会有反应。

<p align="center"><i>给它一张图，还你一只活的桌面宠物。</i></p>

---

## 工作原理

```
你的图片 ──► [抠图：rembg / ImageMagick] ──► 透明的 pet.png
                                                         │
              （可选）生成 idle/walk 序列帧 ──► 精灵图
                                                         │
                       选引擎 ──► Electron 或 PyQt6 模板
                                                         │
                              自包含、可直接运行的 my-pet/ 目录
```

- **两种运行时。** 基于 Web 的 [Electron](https://www.electronjs.org/) 宠物（动画最丰富，跨平台）**或**原生的 [PyQt6](https://www.riverbankcomputing.com/software/pyqt/) 宠物（轻量，在 GNOME/Wayland 上原生）。`auto` 会在已安装 PyQt6 时优先用它，否则用 Electron。
- **智能动画。** 只有一张图时，宠物靠程序化变换动起来（呼吸、行走、挤压拉伸、重力、阴影、对话气泡）。如果你有图像生成能力，skill 还能产出 idle/walk 精灵序列帧，实现真正的逐帧动画（Shimeji 风格）。
- **依赖温和。** 无需提前装任何东西。`rembg`、`PyQt6`、`electron` 都是按需懒加载，带兜底，clone 下来即可用。

## 安装（作为 Claude Code skill）

```bash
git clone <this-repo> ~/.claude/skills/desktop-pet
```

之后在 Claude Code 里直接用自然语言描述即可，例如 *"用 cat.png 做一个桌面宠物"*，skill 会自动接管。也可以直接调生成器：

```bash
node ~/.claude/skills/desktop-pet/scripts/generate.mjs cat.png --name kitty
```

## 用法

```bash
node scripts/generate.mjs <图片> [选项]

选项：
  --name <名字>        项目/显示名                  （默认：my-pet）
  --out <目录>         输出目录                      （默认：./<名字>）
  --runtime <引擎>     auto | electron | pyqt        （默认：auto）
  --cutout <抠图>      auto | none                   （默认：auto）
  --frames <帧>        none | <含 idle_*.png/walk_*.png 的目录>  （默认：none）
  --launch             生成后立即启动
```

### 精灵序列帧（可选，画质最佳）

如果你能生成图片，按约定命名帧并传入目录：

```
my-frames/
├── idle_0.png  idle_1.png  idle_2.png  idle_3.png
└── walk_0.png  walk_1.png  walk_2.png  walk_3.png
```

```bash
node scripts/generate.mjs cat.png --name kitty --frames ./my-frames
```

## 运行生成的宠物

```bash
cd my-pet
./run.sh        # macOS / Linux（Windows 用 run.bat）
```

- **Electron**：首次运行会执行 `npm install`（下载一次 Electron），随后启动。
- **PyQt6**：首次运行若缺 PyQt6 会自动安装，随后启动。

宠物会出现在屏幕底部居中位置。

- **拖动**它到处跑；**把它丢出去**会受重力下落并弹跳。
- **点击**它会蹦一下并冒出对话气泡。
- **右键** → 退出（PyQt）/ 右键 → 拜拜（Electron）。

## 依赖（全部可选 / 懒加载）

| 能力         | 工具                              | 何时用到                               |
|--------------|-----------------------------------|----------------------------------------|
| 抠图         | `rembg`（pip）                    | 最佳画质抠图（兜底：ImageMagick）       |
| 图像处理     | ImageMagick（`convert`/`montage`）| 抠图兜底 + 精灵图拼合                   |
| Electron 宠物 | Node.js + npm                    | `--runtime electron`（无 PyQt6 时默认）|
| PyQt6 宠物   | Python 3.9+                       | `--runtime pyqt`                       |

> **Ubuntu / Debian 提示：** 系统自带镜像没有 `pip`（PEP 668）。用 PyQt6 宠物时，执行一次 `sudo apt install python3-pyqt6` 安装 Qt 即可——生成的 `run.sh` 在检测到缺失 PyQt6/pip/venv 时会打印同样的提示。

## Wayland / GNOME 说明

Electron 模板启动时带 `--ozone-platform-hint=auto`，PyQt6 窗口使用原生的无边框+透明+置顶标志，因此透明置顶宠物在 GNOME/Wayland（以及 X11、macOS、Windows）上都能正常工作。Linux 下需要合成器在运行才能透明。

## 项目结构

```
desktop-pet/
├── SKILL.md                 # skill 入口（给 Claude 的指令）
├── scripts/generate.mjs     # 生成器
├── lib/                     # 抠图、精灵图、运行时选择等辅助模块
├── templates/electron/      # Electron 宠物模板
├── templates/pyqt/          # PyQt6 宠物模板
└── references/              # behaviors.md、animations.md（扩展/调参）
```

## 路线图

计划中的增强（睡眠/爬墙状态、托盘图标、开机自启、多显示器、测试等）见 [ROADMAP.md](ROADMAP.md)。

## 许可证

MIT——详见 [LICENSE](LICENSE)。你生成的宠物归你所有。
