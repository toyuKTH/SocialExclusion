mapboxgl.accessToken = 'pk.eyJ1IjoidG95dWt0aCIsImEiOiJjbTdmeDBkZjcwbGFyMmlzN21mMnNpOXFjIn0.zGMyKcpb-gjpdyhgG-vBSA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/toyukth/cm867tagw007l01sbfsxo1c7m',
    

    center: [13, 55],  // 经度 13°E, 纬度 55°N，居中到欧洲中部附近
    zoom: 2.8       // 适合显示整个欧盟的缩放级别
});

map.on('load', function () {
    console.log("Map has loaded");

    fetch('world.json')
        .then(response => response.json())
        .then(data => {
            console.log("World data loaded:", data);

            // 添加国家边界数据源
            map.addSource('countries', {
                type: 'geojson',
                data: data
            });

            // 颜色匹配数组
            const paintProperties = [
                'match',
                ['get', 'name']
            ];

            //  处理欧盟国家（固定颜色）
            data.features.forEach(feature => {
                let countryName = feature.properties.name;
                if (euColors[countryName]) {
                    paintProperties.push(countryName, euColors[countryName]);
                }
            });

            //  其他所有国家统一使用绿色
            paintProperties.push('rgba(0,0,0,0)'); // 柔和绿色

            // 添加 `fill` 图层
            map.addLayer({
                'id': 'country-fills',
                'type': 'fill',
                'source': 'countries',
                'paint': {
                    'fill-color': paintProperties,
                    // 'fill-outline-color': '#AAAAAA' ,// **边界颜色**
                    'fill-opacity': 0.8
                }
            });

            console.log("Country layer added!");
        })
        .catch(error => console.error("Error loading world.json:", error));
});


const euColors = {
    'Germany': '#EC4229',       // 1
    'Austria': '#D1A028',       // 2
    'France': '#2D9A47',        // 3
    'Czech Republic': '#FBB70D',// 绿色
    'Slovakia': '#C12034',      // 红色
    'Hungary': '#005586',       // 绿色
    'Italy': '#3DAE46',         // 红色
    'Switzerland': '#DE1982',   // 3
    'Belgium': '#4C9F38',       // 绿色
    'Poland': '#DDA63A',        // 橙色
    'Slovenia': '#3DAE46',      // 1
    'Luxembourg': '#C5192D',    // 深红色
    'Bulgaria': '#E5243B',      // 红色
    'Croatia': '#EC4229',       // 2
    'Netherlands': '#DDA63A',   // 橙色
    'Romania': '#DDA63A',       // 橙色
    'Serbia': '#DDA63A',        // 橙色
    'Latvia': '#E5243B',        // 红色
    'Spain': '#46763A',         // 4
    'Lithuania': '#3DAE46',     // 1
    'Greece': '#DDA63A',        // 橙色
    'Denmark': '#DDA63A',       // 橙色
    'Estonia': '#EC4229',       // 2
    'Finland': '#DE1982',       // 3
    'Sweden': '#DDA63A',        // 橙色
    'Portugal': '#46763A',      // 4
    'Cyprus': '#E5243B',        // 红色
    'Ireland': '#3DAE46',       // 1
    'Malta': '#4C9F38'          // 绿色
};


//控制播放声音
document.addEventListener("DOMContentLoaded", function () {
    const playPauseBtn = document.getElementById("playPauseBtn");
    const futureSound = document.getElementById("futureSound");

    let isPlaying = true;

    //页面加载时自动播放
    futureSound.play().then(() => {
        playPauseBtn.textContent = "⏸ Pause";
    }).catch(error =>{
        console.warn(`自动播放失败`,error);
    });

    playPauseBtn.addEventListener("click", function () {
        if (isPlaying) {
            futureSound.pause();
            playPauseBtn.textContent = "▶ Play";
        } else {
            futureSound.play();
            playPauseBtn.textContent = "⏸ Pause";
        }
        isPlaying = !isPlaying;
    });

    // 确保播放完成后按钮恢复
    futureSound.addEventListener("ended", function () {
        playPauseBtn.textContent = "▶ Play";
        isPlaying = false;
    });
});
