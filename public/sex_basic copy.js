mapboxgl.accessToken = 'pk.eyJ1IjoidG95dWt0aCIsImEiOiJjbTdmeDBkZjcwbGFyMmlzN21mMnNpOXFjIn0.zGMyKcpb-gjpdyhgG-vBSA';

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v11',
    center: [13, 55],  // 经度 13°E, 纬度 55°N，居中到欧洲中部附近
    zoom: 3         // 适合显示整个欧盟的缩放级别
});

