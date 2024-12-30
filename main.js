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
const map = L.map('map', {
    minZoom: 2,  // 设置最小缩放级别
    maxBounds: [[-90, -Infinity], [90, Infinity]], // 只限制南北方向，东西方向无限
    maxBoundsViscosity: 1.0,  // 设置边界的"粘性"，1.0表示完全限制在边界内
    worldCopyJump: true  // 允许地图在水平方向无限复制
}).setView([35, 105], 4); // 将初始视图设置在中国中心位置

// 添加OpenStreetMap图层
map.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let events = [];
let markers = [];
let timelineChart; // 存储时间轴实例
let currentEventIndex = -1; // 当前选中的事件索引
let timelineSelection = null;
let timelineHandles = null;
let selectedTimeRange = null;

// 保存当前状态到 localStorage
function saveState() {
    const state = {
        currentEventIndex: currentEventIndex,
        mapCenter: map.getCenter(),
        mapZoom: map.getZoom()
    };
    localStorage.setItem('appState', JSON.stringify(state));
}

// 从 localStorage 恢复状态
function restoreState() {
    const savedState = localStorage.getItem('appState');
    if (savedState) {
        const state = JSON.parse(savedState);
        // 恢复地图状态
        map.setView([state.mapCenter.lat, state.mapCenter.lng], state.mapZoom);
        // 如果有保存的事件索引，显示该事件
        if (state.currentEventIndex >= 0) {
            showEventByIndex(state.currentEventIndex);
        }
        return state.currentEventIndex;
    }
    return -1;
}

// 修改 loadEvents 函数
async function loadEvents() {
    try {
        const response = await fetch('data/events.json');
        const data = await response.json();
        events = data.events;
        
        // 按日期排序事件
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        
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
        
        // 先显示所有标记，再初始化时间轴
        showAllMarkers();
        initTimeline();
        initEventListeners();

        // 尝试恢复保存的状态，如果没有则显示最早的事件
        const restoredIndex = restoreState();
        if (restoredIndex === -1) {
            showEventByIndex(0); // 显示最早的事件
        }
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
    const minDate = d3.min(dates);
    const maxDate = new Date(); // 使用当前日期作为终点
    
    const margin = {top: 20, right: 40, bottom: 20, left: 40};
    const width = document.getElementById('timeline').clientWidth - margin.left - margin.right;
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
        .domain([minDate, maxDate])
        .range([0, width]);
    
    // 添加缩放行为
    const zoom = d3.zoom()
        .scaleExtent([1, 20])
        .on("zoom", zoomed);
    
    // 添加背景
    svg.append("rect")
        .attr("class", "zoom-area")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("pointer-events", "all");
    
    // 添加时间轴背景线
    svg.append("line")
        .attr("class", "timeline-background-line")
        .attr("x1", 0)
        .attr("y1", height/2)
        .attr("x2", width)
        .attr("y2", height/2);
    
    const gX = svg.append("g")
        .attr("class", "timeline-axis")
        .attr("transform", `translate(0,${height})`);
    
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
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 8);
            showTooltip(event, d);
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 6);
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
        gX.call(d3.axisBottom(newXScale).tickFormat(d3.timeFormat("%Y-%m-%d")));
        points.selectAll("circle")
            .attr("cx", d => newXScale(new Date(d.date)));
    }
    
    function updateAxis() {
        const xAxis = d3.axisBottom(xScale)
            .ticks(10)
            .tickFormat(d3.timeFormat("%Y-%m-%d"));
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

function updateTimelineSelection(xScale) {
    if (!xScale) {
        const currentTransform = d3.zoomTransform(timelineChart.svg.node());
        xScale = currentTransform.rescaleX(timelineChart.xScale);
    }
    
    const startX = xScale(selectedTimeRange[0]);
    const endX = xScale(selectedTimeRange[1]);
    
    timelineSelection
        .attr("x", startX)
        .attr("width", endX - startX);
    
    timelineHandles
        .attr("x", (d, i) => (i === 0 ? startX : endX) - 5);
}

function filterByTimeRange() {
    // 从地图上移除所有标记
    markers.forEach(marker => map.removeLayer(marker));
    
    // 添加在时间范围内的标记
    let hasVisibleMarkers = false;
    events.forEach((event, index) => {
        const eventDate = new Date(event.date);
        if (eventDate >= selectedTimeRange[0] && eventDate <= selectedTimeRange[1]) {
            markers[index].addTo(map);
            hasVisibleMarkers = true;
        }
    });
    
    // 如果没有找到任何事件，显示所有标记
    if (!hasVisibleMarkers) {
        console.log('在选定时间范围内没有找到事件，显示所有标记');
        showAllMarkers();
    }
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
    
    // 添加日期验证
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error('无效的日期范围');
        return;
    }
    
    if (startDate > endDate) {
        console.error('开始日期不能晚于结束日期');
        return;
    }
    
    // 从地图上移除所有标记
    markers.forEach(marker => map.removeLayer(marker));
    
    // 添加在日期范围内的标记
    let hasVisibleMarkers = false;
    events.forEach((event, index) => {
        const eventDate = new Date(event.date);
        if (eventDate >= startDate && eventDate <= endDate) {
            markers[index].addTo(map);
            hasVisibleMarkers = true;
        }
    });
    
    // 如果没有找到任何事件，显示所有标记
    if (!hasVisibleMarkers) {
        console.log('在选定日期范围内没有找到事件，显示所有标记');
        showAllMarkers();
        return;
    }
    
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
    });

    // 主题切换按钮
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // 添加导航按钮事件监听
    document.getElementById('prev-event').addEventListener('click', showPreviousEvent);
    document.getElementById('next-event').addEventListener('click', showNextEvent);

    // 添加地图移动结束事件监听
    map.on('moveend', saveState);
    
    // 添加地图缩放结束事件监听
    map.on('zoomend', saveState);
}

function showPreviousEvent() {
    if (currentEventIndex > 0) {
        currentEventIndex--;
        showEventByIndex(currentEventIndex);
    }
    updateNavigationButtons();
}

function showNextEvent() {
    if (currentEventIndex < events.length - 1) {
        currentEventIndex++;
        showEventByIndex(currentEventIndex);
    }
    updateNavigationButtons();
}

function showEventByIndex(index) {
    // 如果之前有选中的事件，关闭其弹窗
    if (currentEventIndex !== -1) {
        markers[currentEventIndex].closePopup();
    }

    if (index >= 0 && index < events.length) {
        currentEventIndex = index;
        const event = events[index];
        
        // 平滑地将事件位置移动到屏幕中心，保持当前缩放级别
        map.panTo([event.location.latitude, event.location.longitude], {
            animate: true,
            duration: 0.5
        });
        
        // 打开对应的标记弹窗
        markers[index].openPopup();
        
        // 高亮时间轴上的点
        d3.selectAll('.timeline-point').classed('active', false);
        d3.select(timelineChart.points.selectAll('circle').nodes()[index]).classed('active', true);
        
        // 更新导航按钮状态
        updateNavigationButtons();
        
        // 保存当前状态
        saveState();
    }
}

function updateNavigationButtons() {
    const prevButton = document.getElementById('prev-event');
    const nextButton = document.getElementById('next-event');
    
    prevButton.disabled = currentEventIndex <= 0;
    nextButton.disabled = currentEventIndex >= events.length - 1;
}

function filterMarkersByDate(selectedDate) {
    // 如果已经选中了这个日期，则取消选中状态
    if (currentEventIndex !== -1 && events[currentEventIndex].date === selectedDate) {
        // 关闭当前打开的弹窗
        markers[currentEventIndex].closePopup();
        currentEventIndex = -1;
        updateNavigationButtons();
        return;
    }

    // 找到选中日期的事件
    const selectedEvent = events.find(e => e.date === selectedDate);
    if (selectedEvent) {
        // 如果之前有选中的事件，关闭其弹窗
        if (currentEventIndex !== -1) {
            markers[currentEventIndex].closePopup();
        }
        
        currentEventIndex = events.indexOf(selectedEvent);
        const marker = markers[currentEventIndex];
        
        // 平滑地将事件位置移动到屏幕中心，保持当前缩放级别
        map.panTo([selectedEvent.location.latitude, selectedEvent.location.longitude], {
            animate: true,
            duration: 0.5
        });
        marker.openPopup();
        updateNavigationButtons();
    }
}

function showAllMarkers() {
    markers.forEach(marker => marker.addTo(map));
    currentEventIndex = -1;
    updateNavigationButtons();
    // 移除所有点的高亮
    d3.selectAll(".timeline-point").classed("active", false);
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