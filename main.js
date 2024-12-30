// 初始化地图
const map = L.map('map').setView([35, 105], 4); // 将初始视图设置在中国中心位置

// 添加OpenStreetMap图层
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// 从JSON文件加载事件数据
async function loadEvents() {
    try {
        const response = await fetch('data/events.json');
        const data = await response.json();
        
        // 添加事件标记
        data.events.forEach(event => {
            const marker = L.marker([event.location.latitude, event.location.longitude])
                .addTo(map)
                .bindPopup(`
                    <div class="event-popup">
                        <h3>${event.event_name}</h3>
                        ${event.image ? `<img src="${event.image}" alt="${event.event_name}" class="event-image">` : ''}
                        <p>${event.description}</p>
                        <p class="event-date">日期：${event.date}</p>
                        ${event.source ? `<p class="event-source">来源：<a href="${event.source}" target="_blank">查看详情</a></p>` : ''}
                    </div>
                `);
        });
    } catch (error) {
        console.error('加载事件数据失败:', error);
    }
}

// 加载事件数据
loadEvents(); 