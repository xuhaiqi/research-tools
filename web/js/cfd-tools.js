/**
 * 数值仿真工具 - JavaScript计算逻辑
 * 基于 NASA US Standard Atmosphere 1976
 */

// ==================== 大气模型 ====================
const R = 287.052;
const GAMMA = 1.4;
const G = 9.80665;
const SEA_LEVEL_PRESSURE = 101325;
const SEA_LEVEL_TEMPERATURE = 288.15;

// 大气分层数据
const ATMOSPHERE_LAYERS = [
    {h: 11000, T: 216.65, dT: -0.0065},
    {h: 20000, T: 216.65, dT: 0},
    {h: 32000, T: 228.65, dT: 0.001},
    {h: 47000, T: 270.65, dT: 0.0028},
    {h: 51000, T: 270.65, dT: 0},
    {h: 71000, T: 214.65, dT: -0.0028},
    {h: 80000, T: 196.65, dT: -0.002},
    {h: 90000, T: 196.65, dT: 0},
    {h: 110000, T: 186.87, dT: 0.002},
];

function temperature(alt) {
    if (alt < 0) alt = 0;
    if (alt === 0) return SEA_LEVEL_TEMPERATURE;
    let T = SEA_LEVEL_TEMPERATURE, h_prev = 0;
    for (let layer of ATMOSPHERE_LAYERS) {
        if (alt <= layer.h) {
            let h = alt - h_prev;
            if (Math.abs(layer.dT) > 1e-10) T += layer.dT * h;
            break;
        }
        let h = layer.h - h_prev;
        if (Math.abs(layer.dT) > 1e-10) T += layer.dT * h;
        else T = layer.T;
        h_prev = layer.h;
    }
    return T;
}

function pressure(alt) {
    if (alt < 0) alt = 0;
    if (alt === 0) return SEA_LEVEL_PRESSURE;
    let p = SEA_LEVEL_PRESSURE, h_prev = 0, T_prev = SEA_LEVEL_TEMPERATURE;
    for (let layer of ATMOSPHERE_LAYERS) {
        if (alt <= layer.h) {
            let h = alt - h_prev;
            if (Math.abs(layer.dT) < 1e-10) {
                p *= Math.exp(-G * h / (R * T_prev));
            } else {
                let T = T_prev + layer.dT * h;
                if (T > 0) p *= Math.pow(T / T_prev, -G / (R * layer.dT));
            }
            break;
        }
        let h = layer.h - h_prev;
        if (Math.abs(layer.dT) < 1e-10) {
            p *= Math.exp(-G * h / (R * T_prev));
        } else {
            let T = T_prev + layer.dT * h;
            if (T > 0) p *= Math.pow(T / T_prev, -G / (R * layer.dT));
        }
        h_prev = layer.h;
        T_prev = layer.T;
    }
    return p;
}

function density(alt) {
    return pressure(alt) / (R * temperature(alt));
}

function speedOfSound(alt) {
    return Math.sqrt(GAMMA * R * temperature(alt));
}

function viscosity(alt) {
    let T = temperature(alt);
    let mu_ref = 1.716e-5, T_ref = 273.15, S = 110.4;
    return mu_ref * Math.pow(T / T_ref, 1.5) * ((T_ref + S) / (T + S));
}

// ==================== 工具切换 ====================
function switchTool(toolId) {
    // 隐藏所有section
    document.querySelectorAll('.calc-section').forEach(s => s.classList.remove('active'));
    // 显示选中的section
    document.getElementById(toolId).classList.add('active');
    // 更新tab状态
    document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    // 更新导航
    document.querySelectorAll('.tool-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`[data-tool="${toolId}"]`).classList.add('active');
}

function setQuick(prefix, altKm, mach) {
    document.getElementById(prefix + '-alt').value = altKm;
    document.getElementById(prefix + '-alt-unit').value = 'km';
    document.getElementById(prefix + '-mach').value = mach;
    
    // 触发计算
    if (prefix === 'atmo') calcAtmosphere();
    else if (prefix === 'yplus') calcYPlus();
}

// ==================== 1. 大气参数计算 ====================
function calcAtmosphere() {
    let alt = parseFloat(document.getElementById('atmo-alt').value);
    if (document.getElementById('atmo-alt-unit').value === 'km') alt *= 1000;
    let mach = parseFloat(document.getElementById('atmo-mach').value);
    
    let T = temperature(alt);
    let p = pressure(alt);
    let rho = density(alt);
    let a = speedOfSound(alt);
    let V = mach * a;
    let q = 0.5 * rho * V * V;
    
    // 总温总压
    let T0 = T * (1 + (GAMMA - 1) / 2 * mach * mach);
    let p0 = p * Math.pow(1 + (GAMMA - 1) / 2 * mach * mach, GAMMA / (GAMMA - 1));
    
    // 粘度
    let mu = viscosity(alt);
    let nu = mu / rho;
    let Re_m = rho * V / mu;
    
    let html = '';
    
    // 飞行条件
    html += '<div class="section-title">飞行条件</div>';
    html += resultItem('飞行高度', (alt/1000).toFixed(2), 'km', 'highlight');
    html += resultItem('马赫数', mach.toFixed(3), 'M', 'highlight');
    html += resultItem('飞行速度', V.toFixed(1), 'm/s', 'highlight');
    
    // 大气参数
    html += '<div class="section-title">大气环境参数</div>';
    html += resultItem('静态温度 T', T.toFixed(2), 'K');
    html += resultItem('静态温度', (T - 273.15).toFixed(2), '°C');
    html += resultItem('静态压力 P', p.toFixed(2), 'Pa');
    html += resultItem('静态压力', (p/1000).toFixed(4), 'kPa');
    html += resultItem('空气密度 ρ', rho.toFixed(6), 'kg/m³');
    html += resultItem('声速 a', a.toFixed(2), 'm/s');
    
    // 总温总压
    html += '<div class="section-title">总温总压 (滞止参数)</div>';
    html += resultItem('总温 T₀', T0.toFixed(2), 'K', 'highlight');
    html += resultItem('总压 P₀', p0.toFixed(2), 'Pa', 'highlight');
    html += resultItem('动压 q', q.toFixed(2), 'Pa', 'highlight');
    
    // 粘性参数
    html += '<div class="section-title">粘性参数</div>';
    html += resultItem('动力粘度 μ', mu.toExponential(2), 'Pa·s');
    html += resultItem('运动粘度 ν', nu.toExponential(2), 'm²/s');
    html += resultItem('雷诺数/米', Re_m.toExponential(2), '1/m');
    
    document.getElementById('atmo-results').innerHTML = html;
}

// ==================== 2. y+ 计算器 ====================
function calcYPlus() {
    let alt = parseFloat(document.getElementById('yplus-alt').value);
    if (document.getElementById('yplus-alt-unit').value === 'km') alt *= 1000;
    let mach = parseFloat(document.getElementById('yplus-mach').value);
    let chord = parseFloat(document.getElementById('yplus-chord').value);
    
    let rho = density(alt);
    let mu = viscosity(alt);
    let nu = mu / rho;
    let a = speedOfSound(alt);
    let V = mach * a;
    
    // 摩阻系数 (Schlichting)
    let Re_x = rho * V * chord / mu;
    let cf = Re_x < 5e5 ? 1.328 / Math.sqrt(Re_x) : 0.074 * Math.pow(Re_x, -0.2);
    
    let tau_w = 0.5 * cf * rho * V * V;
    let u_star = Math.sqrt(tau_w / rho);
    
    // 不同模型的y+
    let models = [
        {name: 'k-ω SST (y+≈1)', target: 1},
        {name: 'Standard k-ε', target: 30},
        {name: 'Scalable wall fn', target: 11},
    ];
    
    let html = '';
    
    html += '<div class="section-title">流动参数</div>';
    html += resultItem('雷诺数 Re_x', Re_x.toExponential(2), '', 'highlight');
    html += resultItem('摩阻系数 Cf', cf.toExponential(4), '');
    html += resultItem('壁面剪切应力', tau_w.toFixed(3), 'Pa');
    html += resultItem('摩擦速度 u*', u_star.toFixed(2), 'm/s');
    html += resultItem('运动粘度 ν', nu.toExponential(2), 'm²/s');
    
    html += '<div class="section-title">第一层网格高度建议</div>';
    for (let m of models) {
        let dy = m.target * nu / u_star;
        html += resultItem(m.name, (dy * 1e6).toFixed(3), 'μm', 'highlight');
    }
    
    document.getElementById('yplus-results').innerHTML = html;
}

// ==================== 3. 附面层计算 ====================
function calcBL() {
    let alt = parseFloat(document.getElementById('bl-alt').value) * 1000;
    let mach = parseFloat(document.getElementById('bl-mach').value);
    let x = parseFloat(document.getElementById('bl-x').value);
    
    let rho = density(alt);
    let mu = viscosity(alt);
    let a = speedOfSound(alt);
    let V = mach * a;
    let nu = mu / rho;
    let Re_x = rho * V * x / mu;
    let turbulent = Re_x > 5e5;
    
    let delta, delta_star, theta;
    if (turbulent) {
        delta = 0.37 * x / Math.pow(Re_x, 0.2);
        delta_star = 0.046 * x / Math.pow(Re_x, 0.2);
        theta = 0.036 * x / Math.pow(Re_x, 0.2);
    } else {
        delta = 5.0 * x / Math.sqrt(Re_x);
        delta_star = 1.7208 * x / Math.sqrt(Re_x);
        theta = 0.664 * x / Math.sqrt(Re_x);
    }
    let H = delta_star / theta;
    
    let html = '';
    
    html += '<div class="section-title">基本参数</div>';
    html += resultItem('雷诺数 Re_x', Re_x.toExponential(2), '', 'highlight');
    html += resultItem('流态', turbulent ? '湍流' : '层流', '', turbulent ? 'warning' : '');
    
    html += '<div class="section-title">附面层厚度</div>';
    html += resultItem('附面层厚度 δ', (delta * 1000).toFixed(4), 'mm');
    html += resultItem('排移厚度 δ*', (delta_star * 1000).toFixed(4), 'mm');
    html += resultItem('动量厚度 θ', (theta * 1000).toFixed(4), 'mm');
    html += resultItem('形状因子 H', H.toFixed(3), '', 'highlight');
    
    document.getElementById('bl-results').innerHTML = html;
}

// ==================== 4. 阻力/升力计算 ====================
const CD_VALUES = {
    'sphere': 0.47,
    'cylinder': 0.99,
    'airfoil_0': 0.006,
    'airfoil_10': 0.08,
    'car': 0.3,
    'truck': 0.7
};

function calcDragLift() {
    let alt = parseFloat(document.getElementById('dl-alt').value) * 1000;
    let mach = parseFloat(document.getElementById('dl-mach').value);
    let area = parseFloat(document.getElementById('dl-area').value);
    let alpha = parseFloat(document.getElementById('dl-alpha').value);
    
    let rho = density(alt);
    let a = speedOfSound(alt);
    let V = mach * a;
    let q = 0.5 * rho * V * V;
    
    // 升力系数 (薄翼理论)
    let cl_alpha = 2 * Math.PI;
    let cl = cl_alpha * Math.PI * alpha / 180;
    let L = cl * q * area;
    
    // 使用翼型的阻力系数
    let cd = alpha === 0 ? 0.006 : 0.08;
    let D = cd * q * area;
    
    let html = '';
    
    html += '<div class="section-title">飞行条件</div>';
    html += resultItem('动压 q', q.toFixed(1), 'Pa');
    html += resultItem('迎角 α', alpha, '°');
    
    html += '<div class="section-title">升力</div>';
    html += resultItem('升力系数 Cl', cl.toFixed(4), '', 'highlight');
    html += resultItem('升力 L', L.toFixed(2), 'N', 'highlight');
    
    html += '<div class="section-title">阻力 (翼型近似)</div>';
    html += resultItem('阻力系数 Cd', cd.toFixed(4), '');
    html += resultItem('阻力 D', D.toFixed(2), 'N', 'highlight');
    
    document.getElementById('dl-results').innerHTML = html;
}

// ==================== 5. 雷诺数计算 ====================
function calcRe() {
    let alt = parseFloat(document.getElementById('re-alt').value) * 1000;
    let mach = parseFloat(document.getElementById('re-mach').value);
    let L = parseFloat(document.getElementById('re-length').value);
    
    let rho = density(alt);
    let mu = viscosity(alt);
    let a = speedOfSound(alt);
    let V = mach * a;
    let Re = rho * V * L / mu;
    let Re_crit = 5e5;
    
    let html = '';
    
    html += resultItem('雷诺数 Re', Re.toExponential(2), '', 'highlight');
    html += resultItem('临界雷诺数', Re_crit.toExponential(2), '');
    html += resultItem('流态', Re > Re_crit ? '湍流' : '层流', '', Re > Re_crit ? 'warning' : '');
    html += resultItem('空气密度', rho.toExponential(4), 'kg/m³');
    html += resultItem('动力粘度', mu.toExponential(4), 'Pa·s');
    html += resultItem('运动粘度', (mu/rho).toExponential(4), 'm²/s');
    
    document.getElementById('re-results').innerHTML = html;
}

// ==================== 辅助函数 ====================
function resultItem(label, value, unit = '', cls = '') {
    return `<div class="result-item ${cls}">
        <div class="result-label">${label}</div>
        <div class="result-value">${value}<span class="result-unit">${unit}</span></div>
    </div>`;
}

// 初始化
window.onload = function() {
    calcAtmosphere();
};
