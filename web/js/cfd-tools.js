/**
 * Numerical Simulation Tools - JavaScript
 * Based on NASA US Standard Atmosphere 1976
 */

// ==================== Atmosphere Model ====================
const R = 287.052;
const GAMMA = 1.4;
const G = 9.80665;
const SEA_LEVEL_PRESSURE = 101325;
const SEA_LEVEL_TEMPERATURE = 288.15;

// Atmosphere layers
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

// ==================== Tool Switch ====================
function switchTool(toolId) {
    document.querySelectorAll('.calc-section').forEach(s => s.classList.remove('active'));
    document.getElementById(toolId).classList.add('active');
    document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.querySelectorAll('.tool-nav a').forEach(a => a.classList.remove('active'));
    document.querySelector(`[data-tool="${toolId}"]`).classList.add('active');
}

function setQuick(prefix, altKm, mach) {
    document.getElementById(prefix + '-alt').value = altKm;
    document.getElementById(prefix + '-alt-unit').value = 'km';
    document.getElementById(prefix + '-mach').value = mach;
    
    if (prefix === 'atmo') calcAtmosphere();
    else if (prefix === 'yplus') calcYPlus();
}

// ==================== 1. Atmosphere Calculator ====================
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
    
    let T0 = T * (1 + (GAMMA - 1) / 2 * mach * mach);
    let p0 = p * Math.pow(1 + (GAMMA - 1) / 2 * mach * mach, GAMMA / (GAMMA - 1));
    
    let mu = viscosity(alt);
    let nu = mu / rho;
    let Re_m = rho * V / mu;
    
    let html = '';
    
    html += '<div class="section-title">Flight Condition</div>';
    html += resultItem('Altitude', (alt/1000).toFixed(2), 'km', 'highlight');
    html += resultItem('Mach Number', mach.toFixed(3), 'M', 'highlight');
    html += resultItem('Velocity', V.toFixed(1), 'm/s', 'highlight');
    
    html += '<div class="section-title">Atmospheric Parameters</div>';
    html += resultItem('Static Temp T', T.toFixed(2), 'K');
    html += resultItem('Static Temp', (T - 273.15).toFixed(2), 'C');
    html += resultItem('Static Pressure P', p.toFixed(2), 'Pa');
    html += resultItem('Static Pressure', (p/1000).toFixed(4), 'kPa');
    html += resultItem('Density', rho.toFixed(6), 'kg/m3');
    html += resultItem('Speed of Sound', a.toFixed(2), 'm/s');
    
    html += '<div class="section-title">Total Conditions (Stagnation)</div>';
    html += resultItem('Total Temp T0', T0.toFixed(2), 'K', 'highlight');
    html += resultItem('Total Pressure P0', p0.toFixed(2), 'Pa', 'highlight');
    html += resultItem('Dynamic Pressure', q.toFixed(2), 'Pa', 'highlight');
    
    html += '<div class="section-title">Viscosity</div>';
    html += resultItem('Dynamic Viscosity', mu.toExponential(2), 'Pa.s');
    html += resultItem('Kinematic Visc', nu.toExponential(2), 'm2/s');
    html += resultItem('Reynolds/m', Re_m.toExponential(2), '1/m');
    
    document.getElementById('atmo-results').innerHTML = html;
}

// ==================== 2. y+ Calculator ====================
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
    
    let Re_x = rho * V * chord / mu;
    let cf = Re_x < 5e5 ? 1.328 / Math.sqrt(Re_x) : 0.074 * Math.pow(Re_x, -0.2);
    
    let tau_w = 0.5 * cf * rho * V * V;
    let u_star = Math.sqrt(tau_w / rho);
    
    let models = [
        {name: 'k-omega SST (y+~1)', target: 1},
        {name: 'Standard k-epsilon', target: 30},
        {name: 'Scalable wall fn', target: 11},
    ];
    
    let html = '';
    
    html += '<div class="section-title">Flow Parameters</div>';
    html += resultItem('Reynolds Re_x', Re_x.toExponential(2), '', 'highlight');
    html += resultItem('Friction Cf', cf.toExponential(4), '');
    html += resultItem('Wall Shear Stress', tau_w.toFixed(3), 'Pa');
    html += resultItem('Friction Vel u*', u_star.toFixed(2), 'm/s');
    html += resultItem('Kinematic Visc', nu.toExponential(2), 'm2/s');
    
    html += '<div class="section-title">First Layer Grid Height</div>';
    for (let m of models) {
        let dy = m.target * nu / u_star;
        html += resultItem(m.name, (dy * 1e6).toFixed(3), 'um', 'highlight');
    }
    
    document.getElementById('yplus-results').innerHTML = html;
}

// ==================== 3. Boundary Layer ====================
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
    
    html += '<div class="section-title">Basic Parameters</div>';
    html += resultItem('Reynolds Re_x', Re_x.toExponential(2), '', 'highlight');
    html += resultItem('Flow Type', turbulent ? 'Turbulent' : 'Laminar', '', turbulent ? 'warning' : '');
    
    html += '<div class="section-title">Boundary Layer Thickness</div>';
    html += resultItem('BL Thickness d', (delta * 1000).toFixed(4), 'mm');
    html += resultItem('Displacement d*', (delta_star * 1000).toFixed(4), 'mm');
    html += resultItem('Momentum th', (theta * 1000).toFixed(4), 'mm');
    html += resultItem('Shape Factor H', H.toFixed(3), '', 'highlight');
    
    document.getElementById('bl-results').innerHTML = html;
}

// ==================== 4. Drag & Lift ====================
function calcDragLift() {
    let alt = parseFloat(document.getElementById('dl-alt').value) * 1000;
    let mach = parseFloat(document.getElementById('dl-mach').value);
    let area = parseFloat(document.getElementById('dl-area').value);
    let alpha = parseFloat(document.getElementById('dl-alpha').value);
    
    let rho = density(alt);
    let a = speedOfSound(alt);
    let V = mach * a;
    let q = 0.5 * rho * V * V;
    
    let cl_alpha = 2 * Math.PI;
    let cl = cl_alpha * Math.PI * alpha / 180;
    let L = cl * q * area;
    
    let cd = alpha === 0 ? 0.006 : 0.08;
    let D = cd * q * area;
    
    let html = '';
    
    html += '<div class="section-title">Flight Condition</div>';
    html += resultItem('Dynamic Pressure', q.toFixed(1), 'Pa');
    html += resultItem('Angle of Attack', alpha, 'deg');
    
    html += '<div class="section-title">Lift</div>';
    html += resultItem('Lift Coef Cl', cl.toFixed(4), '', 'highlight');
    html += resultItem('Lift Force', L.toFixed(2), 'N', 'highlight');
    
    html += '<div class="section-title">Drag (Airfoil)</div>';
    html += resultItem('Drag Coef Cd', cd.toFixed(4), '');
    html += resultItem('Drag Force', D.toFixed(2), 'N', 'highlight');
    
    document.getElementById('dl-results').innerHTML = html;
}

// ==================== 5. Reynolds Number ====================
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
    
    html += resultItem('Reynolds Number', Re.toExponential(2), '', 'highlight');
    html += resultItem('Critical Re', Re_crit.toExponential(2), '');
    html += resultItem('Flow Type', Re > Re_crit ? 'Turbulent' : 'Laminar', '', Re > Re_crit ? 'warning' : '');
    html += resultItem('Density', rho.toExponential(4), 'kg/m3');
    html += resultItem('Viscosity', mu.toExponential(4), 'Pa.s');
    html += resultItem('Kinematic Visc', (mu/rho).toExponential(4), 'm2/s');
    
    document.getElementById('re-results').innerHTML = html;
}

// ==================== Helper ====================
function resultItem(label, value, unit, cls) {
    return '<div class="result-item ' + cls + '">' +
        '<div class="result-label">' + label + '</div>' +
        '<div class="result-value">' + value + '<span class="result-unit">' + unit + '</span></div>' +
    '</div>';
}

window.onload = function() {
    calcAtmosphere();
};
