# 互联网历史事件地图 🌐

> 这个项目是为了我的 LMC 课程作业而制作的。

这是一个交互式的互联网历史事件地图，展示了从 ARPANET 诞生到 ChatGPT 发布等重要的互联网发展里程碑。

## 功能特点 ✨

- 🗺️ 交互式地图展示历史事件发生地点
- 📅 可视化时间轴展示事件发生顺序
- 🌓 支持明暗主题切换
- 📱 响应式设计，支持移动端访问
- 🖼️ 丰富的历史图片资料
- 🔍 事件详情弹窗展示
- ⌛ 时间轴缩放功能
- ⬅️ ➡️ 事件导航功能

## 技术栈 🛠️

- Leaflet.js - 开源地图库
- D3.js - 数据可视化库
- HTML5 & CSS3
- JavaScript (ES6+)

## 本地运行 🚀

1. 克隆项目到本地：
```bash
git clone https://github.com/WallBreakerNO4/lmc
```

2. 使用本地服务器运行项目（比如 Python 的 HTTP 服务器）：
```bash
python -m http.server
```

3. 在浏览器中访问 `http://localhost:8000`

## 项目结构 📁

```
.
├── index.html          # 主页面
├── styles.css          # 样式文件
├── main.js            # 主要JavaScript逻辑
├── data/              # 数据文件夹
│   ├── events.json    # 事件数据
│   ├── events.md      # 事件详细描述
│   └── images/        # 事件相关图片
└── favicon.ico        # 网站图标
```

## 数据格式 📝

事件数据存储在 `data/events.json` 中，每个事件包含以下字段：

```json
{
    "event_name": "事件名称",
    "description": "事件描述",
    "date": "事件日期",
    "location": {
        "latitude": 纬度,
        "longitude": 经度
    },
    "image": "图片路径",
    "images": ["多张图片路径"],
    "source": "可选的来源链接"
}
```

## 功能说明 📖

- **地图交互**：可以拖动、缩放地图查看不同地区的历史事件
- **时间轴**：
  - 使用鼠标滚轮可以缩放时间轴
  - 点击时间点可以查看对应事件详情
  - 使用导航按钮可以按时间顺序浏览事件
- **主题切换**：点击左上角的主题切换按钮可以在明暗主题间切换
- **状态保存**：会自动保存用户的查看位置和主题选择

## 贡献指南 🤝

欢迎提交 Pull Request 来完善这个项目！你可以：

- 添加新的历史事件
- 补充或修正现有事件信息
- 改进用户界面
- 优化代码实现
- 修复 bug

## 许可证 📄

MIT License