// 主题切换相关函数
function initTheme() {
    // 检查本地存储中是否有保存的主题
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateMapTheme(savedTheme);
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateMapTheme(newTheme);
}

function updateMapTheme(theme) {
    if (theme === 'dark') {
        // 切换到暗色地图图层
        map.removeLayer(map.tileLayer);
        map.tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        }).addTo(map);
    } else {
        // 切换到亮色地图图层
        map.removeLayer(map.tileLayer);
        map.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }
}

// 初始化地图
const map = L.map('map').setView([35, 105], 4); // 将初始视图设置在中国中心位置

// 添加OpenStreetMap图层
map.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let events = [];
let markers = [];
let timelineChart; // 存储时间轴实例

// 修改 loadEvents 函数
async function loadEvents() {
    try {
        const response = await fetch('data/events.json');
        const data = await response.json();
        events = data.events;
        
        // 初始化日期选择器
        initDatePickers();
        
        // 添加事件标记
        events.forEach(event => {
            const marker = L.marker([event.location.latitude, event.location.longitude])
                .bindPopup(`
                    <div class="event-popup">
                        <h3>${event.event_name}</h3>
                        ${event.image ? `<img src="${event.image}" alt="${event.event_name}" class="event-image">` : ''}
                        <p>${event.description}</p>
                        <p class="event-date">日期：${event.date}</p>
                        ${event.source ? `<p class="event-source">来源：<a href="${event.source}" target="_blank">查看详情</a></p>` : ''}
                    </div>
                `);
            markers.push(marker);
        });
        
        initTimeline();
        showAllMarkers();
        initEventListeners();
    } catch (error) {
        console.error('加载事件数据失败:', error);
    }
}

function initDatePickers() {
    const dates = events.map(e => new Date(e.date));
    const minDate = d3.min(dates);
    const maxDate = new Date(); // 使用当前日期作为最大值
    
    const startDatePicker = document.getElementById('start-date');
    const endDatePicker = document.getElementById('end-date');
    
    startDatePicker.value = formatDate(minDate);
    endDatePicker.value = formatDate(maxDate);
    
    startDatePicker.min = formatDate(minDate);
    startDatePicker.max = formatDate(maxDate);
    endDatePicker.min = formatDate(minDate);
    endDatePicker.max = formatDate(maxDate);
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function initTimeline() {
    const dates = events.map(e => new Date(e.date));
    const timeExtent = [d3.min(dates), new Date()]; // 使用当前日期作为终点
    
    const margin = {top: 20, right: 40, bottom: 20, left: 40};
    const width = 800 - margin.left - margin.right;
    const height = 100 - margin.top - margin.bottom;
    
    // 清除现有的时间轴
    d3.select("#timeline").selectAll("*").remove();
    
    const svg = d3.select("#timeline").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // 创建可缩放的时间比例尺
    const xScale = d3.scaleTime()
        .domain(timeExtent)
        .range([0, width]);
    
    // 添加缩放行为
    const zoom = d3.zoom()
        .scaleExtent([1, 20])
        .on("zoom", zoomed);
    
    svg.append("rect")
        .attr("class", "zoom-area")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all");
    
    const gX = svg.append("g")
        .attr("class", "timeline-axis")
        .attr("transform", `translate(0,${height/2})`);
    
    const points = svg.append("g")
        .attr("class", "points");
    
    // 添加事件点
    points.selectAll("circle")
        .data(events)
        .enter()
        .append("circle")
        .attr("class", "timeline-point")
        .attr("cx", d => xScale(new Date(d.date)))
        .attr("cy", height/2)
        .attr("r", 6)
        .on("mouseover", function(event, d) {
            d3.select(this).attr("r", 8);
            showTooltip(event, d);
        })
        .on("mouseout", function() {
            d3.select(this).attr("r", 6);
            hideTooltip();
        })
        .on("click", function(event, d) {
            filterMarkersByDate(d.date);
            highlightPoint(this);
        });
    
    // 初始化轴
    updateAxis();
    
    // 应用缩放行为
    svg.call(zoom);
    
    function zoomed(event) {
        const newXScale = event.transform.rescaleX(xScale);
        gX.call(d3.axisBottom(newXScale).tickFormat(d3.timeFormat("%Y")));
        points.selectAll("circle")
            .attr("cx", d => newXScale(new Date(d.date)));
    }
    
    function updateAxis() {
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d3.timeFormat("%Y"));
        gX.call(xAxis);
    }
    
    // 存储时间轴实例以供后续使用
    timelineChart = {
        svg,
        xScale,
        points,
        gX,
        zoom,
        width,
        height,
        margin
    };
}

function showTooltip(event, data) {
    const tooltip = d3.select("body").append("div")
        .attr("class", "timeline-tooltip")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("display", "block");
    
    tooltip.html(`
        <strong>${data.event_name}</strong><br>
        ${data.date}
    `);
}

function hideTooltip() {
    d3.selectAll(".timeline-tooltip").remove();
}

function filterByDateRange() {
    const startDate = new Date(document.getElementById('start-date').value);
    const endDate = new Date(document.getElementById('end-date').value);
    
    // 从地图上移除所有标记
    markers.forEach(marker => map.removeLayer(marker));
    
    // 添加在日期范围内的标记
    events.forEach((event, index) => {
        const eventDate = new Date(event.date);
        if (eventDate >= startDate && eventDate <= endDate) {
            markers[index].addTo(map);
        }
    });
    
    // 更新时间轴视图
    const newDomain = [startDate, endDate];
    timelineChart.xScale.domain(newDomain);
    timelineChart.svg.call(timelineChart.zoom.transform, d3.zoomIdentity);
    timelineChart.gX.call(d3.axisBottom(timelineChart.xScale).tickFormat(d3.timeFormat("%Y")));
    timelineChart.points.selectAll("circle")
        .attr("cx", d => timelineChart.xScale(new Date(d.date)));
}

function initEventListeners() {
    // 显示所有事件按钮
    document.getElementById('show-all-btn').addEventListener('click', () => {
        showAllMarkers();
        // 重置时间轴缩放
        timelineChart.svg.call(timelineChart.zoom.transform, d3.zoomIdentity);
    });
    
    // 日期筛选按钮
    document.getElementById('filter-date-btn').addEventListener('click', filterByDateRange);

    // 主题切换按钮
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
}

function filterMarkersByDate(selectedDate) {
    // 从地图上移除所有标记
    markers.forEach(marker => map.removeLayer(marker));
    
    // 找到选中日期的事件并显示对应标记
    const selectedEvent = events.find(e => e.date === selectedDate);
    if (selectedEvent) {
        const marker = markers[events.indexOf(selectedEvent)];
        marker.addTo(map);
        map.setView([selectedEvent.location.latitude, selectedEvent.location.longitude], 8);
        marker.openPopup();
    }
}

function showAllMarkers() {
    markers.forEach(marker => marker.addTo(map));
}

function highlightPoint(element) {
    // 移除所有点的高亮
    d3.selectAll(".timeline-point").classed("active", false);
    // 高亮选中的点
    d3.select(element).classed("active", true);
}

// 初始化主题
initTheme();
// 加载事件数据
loadEvents(); 