mapboxgl.accessToken = 'pk.eyJ1IjoidG95dWt0aCIsImEiOiJjbTdmeDBkZjcwbGFyMmlzN21mMnNpOXFjIn0.zGMyKcpb-gjpdyhgG-vBSA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [15.0, 60.0], // 以瑞典为中心
    zoom: 4
});

//  连接 WebSocket
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => console.log("✅ WebSocket 连接成功");
ws.onerror = (error) => console.error("❌ WebSocket 连接失败:", error);

let heatmapData = null;

// **加载 JSON 数据**
fetch("heatmap_data.json")
    .then(response => response.json())
    .then(data => {
        console.log(" ✅热力图数据加载成功", data);
        heatmapData = data;
    })
    .catch(error => console.error(" 加载 heatmap_data.json 失败:", error));







// 加载 `world.json`（国家边界数据）
fetch('world.json')
    .then(response => response.json())
    .then(data => {
        console.log("🌍 world.json 加载成功！");

        // ✅ 确保所有 Feature 都有数值 `id`
        data.features.forEach((feature, index) => {
            if (typeof feature.id !== "number") {
                feature.id = index;  // 赋予唯一的数值 `id`
            }
        });

        map.on('load', function () {
            // 添加国家边界数据
            map.addSource('countries', {
                type: 'geojson',
                data: data
            });

            // 绘制国家填充区域（默认透明）
           /* map.addLayer({
                id: 'country-fills',
                type: 'fill',
                source: 'countries',
                paint: {
                    //'fill-color': '#4F82F6', // 使用淡蓝色
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false], 0.5,
                        0.2   // 默认透明度
                    ]
                }
            });
            */
            map.addLayer({
                id: 'country-fills',
                type: 'fill',
                source: 'countries',
                paint: {
                    // **颜色初始设为空，后续由 updateHeatmap(year) 控制**
                    'fill-color': "rgba(0, 0, 0, 0)",
            
                    // **鼠标悬停时高亮国家**
                    'fill-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false], 0.6, // 悬停时更明显
                        0.7  // 默认透明度
                    ]
                }
            });
            
            

            // 绘制国家边界（柔和边界）
            map.addLayer({
                id: 'country-borders',
                type: 'line',
                source: 'countries',
                paint: {
                    'line-color': 'rgba(255, 255, 255, 0.5)', // 透明白色
                    'line-width': 1
                }
            });

            console.log("✅ 国家边界已加载，等待鼠标交互...");

            // 存储当前悬停国家
            let hoveredCountryId = null;

            // ✅ 鼠标悬停时高亮单个国家
            map.on('mousemove', 'country-fills', function (e) {
                const countryFeatures = e.features; // 直接获取 features

                if (countryFeatures.length > 0) {
                    console.log("🎯 当前悬停的 Feature:", countryFeatures[0]);
                    console.log("🎯 当前悬停的 ID:", countryFeatures[0].id);

                    if (hoveredCountryId !== null) {
                        map.setFeatureState(
                            { source: 'countries', id: hoveredCountryId },
                            { hover: false }
                        );
                    }

                    hoveredCountryId = countryFeatures[0].id;  
                    map.setFeatureState(
                        { source: 'countries', id: hoveredCountryId },
                        { hover: true }
                    );

                    map.getCanvas().style.cursor = 'pointer';
                }
            });

            //  鼠标移出国家时恢复透明度
            map.on('mouseleave', 'country-fills', function () {
                if (hoveredCountryId !== null) {
                    map.setFeatureState(
                        { source: 'countries', id: hoveredCountryId },
                        { hover: false }
                    );
                    hoveredCountryId = null;
                }
                map.getCanvas().style.cursor = '';
            });

            // 监听点击事件
            map.on('click', function (e) {
                console.log("📍 你点击了地图，查询国家信息...");

                const countryFeatures = map.queryRenderedFeatures(e.point, { layers: ['country-fills'] });

                if (countryFeatures.length > 0) {
                    const clickedCountryId = countryFeatures[0].id;
                    const countryName = countryFeatures[0].properties.name;
                    console.log(`🎵 你点击了国家: ${countryName}`);

                    // 发送国家信息到 WebSocket 服务器
                    ws.send(JSON.stringify({ country: countryName }));

                    // 仅高亮当前点击的国家
                    map.setFeatureState(
                        { source: 'countries', id: clickedCountryId },
                        { hover: true }
                    );

                    // 2 秒后恢复透明度
                    setTimeout(() => {
                        map.setFeatureState(
                            { source: 'countries', id: clickedCountryId },
                            { hover: false }
                        );
                    }, 2000);

                    alert(` 你点击了 ${countryName}，正在播放相应的声音！`);
                } else {
                    console.warn(" 你点击的地方没有国家数据");
                }
            });
        });
    })
    .catch(error => console.error(" 加载 world.json 失败:", error));

// **颜色梯度计算**
function getColorForValue(value) {
    if (value <= 20) return "#fee5d9"; // 浅粉
    if (value <= 40) return "#fcae91"; // 橙色
    if (value <= 60) return "#fb6a4a"; // 深橙
    if (value <= 80) return "#de2d26"; // 红色
    return "#a50f15"; // 深红
}

// **更新热力图**
function updateHeatmap(year) {
    if (!heatmapData || !map.getLayer("country-fills")) return;

    const paintProperties = [
        "match",
        ["get", "name"]
    ];

    for (const country in heatmapData) {
        if (heatmapData[country] && heatmapData[country][year] !== undefined) {
            let value = heatmapData[country][year];
            let color = getColorForValue(value);
            paintProperties.push(country, color);
        } else {
            paintProperties.push(country, "rgba(0, 0, 0, 0)"); // 无数据设为透明
        }
    }

    paintProperties.push("rgba(0, 0, 0, 0)"); // 默认透明

    map.setPaintProperty("country-fills", "fill-color", paintProperties);
    console.log(` 更新热力图至 ${year} 年`);
}

// **自动播放热力图**
let isPlaying = false;
let intervalId = null;
let currentYear = 2016;
const minYear = 2016;
const maxYear = 2024;

function togglePlayPause() {
    const button = document.getElementById("playPauseBtn");
    const timeline = document.getElementById("timeline");
    const yearLabel = document.getElementById("current-year");
     
    if (isPlaying) {
        clearInterval(intervalId);
        console.log(" 热力图播放暂停");
        button.innerHTML = "Start";
    } else {
        intervalId = setInterval(() => {
            updateHeatmap(currentYear);
            console.log(` 显示 ${currentYear} 年`);

            //时间轴更新
            timeline.value = currentYear;
            yearLabel.innerText = currentYear;
            currentYear = (currentYear < maxYear) ? currentYear + 1 : minYear;
        }, 2000);
        
        console.log(" 热力图播放开始");
        button.innerHTML ="Pause";
    }
    isPlaying = !isPlaying;
}
document.getElementById("playPauseBtn").addEventListener("click", togglePlayPause);

//startAutoPlay(); // **页面加载后，自动播放热力图**
