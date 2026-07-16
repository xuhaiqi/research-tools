// 科研工具集 - JavaScript

// ==================== 导航功能 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 工具导航点击
    // Only intercept in-page tool tabs. Links to separate pages, such as
    // cfd.html, must keep their normal browser navigation behavior.
    const toolLinks = document.querySelectorAll('#toolList a[href^="#"][data-tool]');
    const toolSections = document.querySelectorAll('.tool-section');
    
    toolLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const toolId = this.dataset.tool;
            
            // 更新导航状态
            toolLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // 显示对应工具
            toolSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === toolId) {
                    section.classList.add('active');
                }
            });
            
            // 滚动到顶部
            window.scrollTo({ top: 200, behavior: 'smooth' });
        });
    });
    
    // 初始化单位换算选项
    updateUnitOptions();
});

// ==================== 工具1: 文本去空格 ====================
function trimText() {
    let text = document.getElementById('trim-input').value;
    const trimSpace = document.getElementById('trim-space').checked;
    const trimNewline = document.getElementById('trim-newline').checked;
    const trimTab = document.getElementById('trim-tab').checked;
    const trimExtra = document.getElementById('trim-extra').checked;
    
    if (trimNewline) {
        text = text.replace(/[\r\n]+/g, '');
    }
    if (trimTab) {
        text = text.replace(/\t/g, '');
    }
    if (trimSpace) {
        text = text.replace(/ /g, '');
    }
    if (trimExtra) {
        text = text.replace(/ +/g, '');
    }
    
    document.getElementById('trim-output').value = text;
}

// ==================== 工具2: 科学计数法转换 ====================
function sciToDecimal() {
    const input = document.getElementById('sci-input').value;
    const precision = parseInt(document.getElementById('sci-precision').value);
    const lines = input.split('\n');
    const results = [];
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        // 移除逗号
        line = line.replace(/,/g, '');
        
        try {
            const num = parseFloat(line);
            if (!isNaN(num)) {
                let formatted = num.toFixed(precision);
                // 移除尾随的0
                formatted = formatted.replace(/\.?0+$/, '');
                results.push(formatted);
            } else {
                results.push('无效数字');
            }
        } catch (e) {
            results.push('无效数字');
        }
    });
    
    document.getElementById('sci-output').value = results.join('\n');
}

function decimalToSci() {
    const input = document.getElementById('sci-input').value;
    const precision = parseInt(document.getElementById('sci-precision').value);
    const lines = input.split('\n');
    const results = [];
    
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        
        line = line.replace(/,/g, '');
        
        try {
            const num = parseFloat(line);
            if (!isNaN(num)) {
                results.push(num.toExponential(precision));
            } else {
                results.push('无效数字');
            }
        } catch (e) {
            results.push('无效数字');
        }
    });
    
    document.getElementById('sci-output').value = results.join('\n');
}

// ==================== 工具3: 单位换算 ====================
const unitData = {
    length: {
        '米 (m)': 1,
        '千米 (km)': 1000,
        '厘米 (cm)': 0.01,
        '毫米 (mm)': 0.001,
        '微米 (μm)': 1e-6,
        '纳米 (nm)': 1e-9,
        '英里 (mi)': 1609.344,
        '英尺 (ft)': 0.3048,
        '英寸 (in)': 0.0254
    },
    weight: {
        '克 (g)': 1,
        '千克 (kg)': 1000,
        '毫克 (mg)': 0.001,
        '吨 (t)': 1e6,
        '磅 (lb)': 453.592,
        '盎司 (oz)': 28.3495
    },
    temperature: {
        '摄氏度 (°C)': 'celsius',
        '华氏度 (°F)': 'fahrenheit',
        '开尔文 (K)': 'kelvin'
    },
    area: {
        '平方米 (m²)': 1,
        '平方千米 (km²)': 1e6,
        '公顷 (ha)': 10000,
        '平方厘米 (cm²)': 1e-4,
        '平方毫米 (mm²)': 1e-6,
        '英亩 (acre)': 4046.86,
        '平方英尺 (ft²)': 0.0929
    },
    volume: {
        '升 (L)': 1,
        '毫升 (mL)': 0.001,
        '立方米 (m³)': 1000,
        '立方厘米 (cm³)': 0.001,
        '加仑-美 (gal)': 3.78541,
        '加仑-英 (gal UK)': 4.54609
    },
    pressure: {
        '帕斯卡 (Pa)': 1,
        '千帕 (kPa)': 1000,
        '兆帕 (MPa)': 1e6,
        '巴 (bar)': 1e5,
        '标准大气压 (atm)': 101325,
        '毫米汞柱 (mmHg)': 133.322,
        '磅力/平方英寸 (psi)': 6894.76
    },
    energy: {
        '焦耳 (J)': 1,
        '千焦 (kJ)': 1000,
        '卡 (cal)': 4.184,
        '千卡 (kcal)': 4184,
        '瓦时 (Wh)': 3600,
        '千瓦时 (kWh)': 3.6e6
    },
    power: {
        '瓦特 (W)': 1,
        '千瓦 (kW)': 1000,
        '兆瓦 (MW)': 1e6,
        '马力 (hp)': 745.7
    },
    time: {
        '秒 (s)': 1,
        '毫秒 (ms)': 0.001,
        '微秒 (μs)': 1e-6,
        '分钟 (min)': 60,
        '小时 (h)': 3600,
        '天 (d)': 86400,
        '周 (week)': 604800,
        '年 (year)': 31536000
    }
};

function updateUnitOptions() {
    const category = document.getElementById('unit-category').value;
    const units = Object.keys(unitData[category]);
    
    const fromSelect = document.getElementById('unit-from');
    const toSelect = document.getElementById('unit-to');
    
    fromSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
    toSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
    
    // 设置默认选项
    if (units.length > 1) {
        toSelect.selectedIndex = 1;
    }
}

function convertUnit() {
    const category = document.getElementById('unit-category').value;
    const fromUnit = document.getElementById('unit-from').value;
    const toUnit = document.getElementById('unit-to').value;
    const inputVal = document.getElementById('unit-input').value;
    
    if (!inputVal) {
        document.getElementById('unit-output').value = '';
        return;
    }
    
    const value = parseFloat(inputVal);
    if (isNaN(value)) {
        document.getElementById('unit-output').value = '无效数值';
        return;
    }
    
    // 温度特殊处理
    if (category === 'temperature') {
        let celsius;
        
        // 转换为摄氏度
        if (fromUnit === '摄氏度 (°C)') {
            celsius = value;
        } else if (fromUnit === '华氏度 (°F)') {
            celsius = (value - 32) * 5 / 9;
        } else if (fromUnit === '开尔文 (K)') {
            celsius = value - 273.15;
        }
        
        // 从摄氏度转换
        let result;
        if (toUnit === '摄氏度 (°C)') {
            result = celsius;
        } else if (toUnit === '华氏度 (°F)') {
            result = celsius * 9 / 5 + 32;
        } else if (toUnit === '开尔文 (K)') {
            result = celsius + 273.15;
        }
        
        document.getElementById('unit-output').value = result.toFixed(6).replace(/\.?0+$/, '');
    } else {
        const fromFactor = unitData[category][fromUnit];
        const toFactor = unitData[category][toUnit];
        const result = value * fromFactor / toFactor;
        
        let resultStr;
        if (Math.abs(result) < 0.0001 || Math.abs(result) > 1e10) {
            resultStr = result.toExponential(6);
        } else {
            resultStr = result.toFixed(10).replace(/\.?0+$/, '');
        }
        
        document.getElementById('unit-output').value = resultStr;
    }
}

function swapUnit() {
    const fromSelect = document.getElementById('unit-from');
    const toSelect = document.getElementById('unit-to');
    
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
    
    convertUnit();
}

// ==================== 工具4: 繁简转换 ====================
const s2tDict = {};
const t2sDict = {};

// 常用繁简对照表（简化版）
function initS2TDict() {
    const pairs = [
        ['学', '學'], ['研', '硏'], ['发', '發'], ['工', '工'], ['具', '具'],
        ['开', '開'], ['关', '關'], ['见', '見'], ['时', '時'], ['为', '爲'],
        ['动', '動'], ['声', '聲'], ['应', '應'], ['数', '數'], ['电', '電'],
        ['车', '車'], ['转', '轉'], ['运', '運'], ['过', '過'], ['还', '還'],
        ['进', '進'], ['远', '遠'], ['连', '連'], ['同', '同'], ['总', '總'],
        ['经', '經'], ['结', '結'], ['问题', '問題'], ['请', '請'], ['对', '對'],
        ['于', '於'], ['将', '將'], ['当', '當'], ['从', '從'], ['向', '向'],
        ['后', '後'], ['与', '與'], ['及', '及'], ['或', '或'], ['者', '者'],
        ['都', '都'], ['部', '部'], ['分', '分'], ['系', '係'], ['列', '列車'],
        ['新', '新'], ['闻', '聞'], ['实', '實'], ['验', '驗'], ['码', '碼'],
        ['网', '網'], ['线', '線'], ['内', '內'], ['容', '容'], ['标', '標'],
        ['题', '題'], ['记', '記'], ['录', '錄'], ['片', '片'], ['图', '圖'],
        ['像', '像'], ['表', '表'], ['示', '示'], ['息', '息'], ['请', '請']
    ];
    
    pairs.forEach(([s, t]) => {
        s2tDict[s] = t;
        t2sDict[t] = s;
    });
}

function convertS2T() {
    const input = document.getElementById('s2t-input').value;
    const mode = document.querySelector('input[name="s2t-mode"]:checked').value;
    
    initS2TDict();
    
    let result = input;
    const dict = (mode === 't2s') ? t2sDict : s2tDict;
    
    // 简单替换（实际项目中建议使用更完整的词典）
    Object.keys(dict).forEach(key => {
        const regex = new RegExp(key, 'g');
        result = result.replace(regex, dict[key]);
    });
    
    document.getElementById('s2t-output').value = result;
}

// ==================== 工具5: 随机数生成 ====================
function generateRandom() {
    const min = parseFloat(document.getElementById('random-min').value);
    const max = parseFloat(document.getElementById('random-max').value);
    const count = parseInt(document.getElementById('random-count').value);
    const decimal = parseInt(document.getElementById('random-decimal').value);
    const unique = document.getElementById('random-unique').checked;
    const sort = document.getElementById('random-sort').value;
    const sep = document.getElementById('random-sep').value;
    
    if (isNaN(min) || isNaN(max) || isNaN(count)) {
        alert('请输入有效的数字');
        return;
    }
    
    if (min > max) {
        alert('最小值不能大于最大值');
        return;
    }
    
    if (unique && count > (max - min + 1) && decimal === 0) {
        alert('在不重复的情况下，范围不够生成指定数量的随机数');
        return;
    }
    
    const numbers = [];
    
    if (decimal === 0) {
        // 整数
        if (unique) {
            const range = [];
            for (let i = Math.floor(min); i <= Math.floor(max); i++) {
                range.push(i);
            }
            for (let i = 0; i < count && range.length > 0; i++) {
                const idx = Math.floor(Math.random() * range.length);
                numbers.push(range.splice(idx, 1)[0]);
            }
        } else {
            for (let i = 0; i < count; i++) {
                numbers.push(Math.floor(Math.random() * (max - min + 1)) + min);
            }
        }
    } else {
        // 小数
        for (let i = 0; i < count; i++) {
            const num = min + Math.random() * (max - min);
            numbers.push(num);
        }
    }
    
    // 排序
    if (sort === 'asc') {
        numbers.sort((a, b) => a - b);
    } else if (sort === 'desc') {
        numbers.sort((a, b) => b - a);
    } else if (sort === 'random') {
        numbers.sort(() => Math.random() - 0.5);
    }
    
    // 格式化
    const formatted = numbers.map(n => {
        if (decimal === 0) return String(n);
        return n.toFixed(decimal);
    });
    
    // 分隔符
    let separator = '\n';
    if (sep === 'comma') separator = ', ';
    else if (sep === 'space') separator = ' ';
    
    document.getElementById('random-output').value = formatted.join(separator);
}

// ==================== 工具6: 字符计数 ====================
function countChars() {
    const text = document.getElementById('count-input').value;
    
    // 总字符数
    document.getElementById('count-total').textContent = text.length;
    
    // 中文字符
    const cnMatches = text.match(/[\u4e00-\u9fff]/g) || [];
    document.getElementById('count-cn').textContent = cnMatches.length;
    
    // 英文字母
    const enMatches = text.match(/[a-zA-Z]/g) || [];
    document.getElementById('count-en').textContent = enMatches.length;
    
    // 数字
    const numMatches = text.match(/\d/g) || [];
    document.getElementById('count-num').textContent = numMatches.length;
    
    // 空格
    const spaceMatches = text.match(/ /g) || [];
    document.getElementById('count-space').textContent = spaceMatches.length;
    
    // 标点符号
    const punctMatches = text.match(/[^\w\s]/g) || [];
    document.getElementById('count-punct').textContent = punctMatches.length;
    
    // 单词数
    const wordMatches = text.match(/[a-zA-Z]+/g) || [];
    document.getElementById('count-words').textContent = wordMatches.length;
    
    // 行数
    const lines = text.split('\n');
    document.getElementById('count-lines').textContent = lines.length;
}

// ==================== 工具7: 行号处理 ====================
function processLine() {
    const input = document.getElementById('line-input').value;
    const mode = document.querySelector('input[name="line-mode"]:checked').value;
    
    if (mode === 'add') {
        const start = parseInt(document.getElementById('line-start').value) || 1;
        const width = parseInt(document.getElementById('line-width').value) || 4;
        const sep = document.getElementById('line-sep').value;
        
        const lines = input.split('\n');
        const result = lines.map((line, i) => {
            const num = String(i + start).padStart(width, '0');
            return num + sep + line;
        }).join('\n');
        
        document.getElementById('line-output').value = result;
    } else {
        // 去除行号
        const lines = input.split('\n');
        const result = lines.map(line => {
            // 匹配常见格式: 001: 内容 或 001 - 内容
            const match = line.match(/^\d+\s*[:\-\.]\s*(.*)$/);
            return match ? match[1] : line;
        }).join('\n');
        
        document.getElementById('line-output').value = result;
    }
}

// ==================== 工具8: 文本排序 ====================
function sortText() {
    let text = document.getElementById('sort-input').value;
    const type = document.getElementById('sort-type').value;
    const order = document.getElementById('sort-order').value;
    const unique = document.getElementById('sort-unique').checked;
    const ignoreCase = document.getElementById('sort-ignore').checked;
    const removeEmpty = document.getElementById('sort-empty').checked;
    
    let lines = text.split('\n');
    
    // 去除空行
    if (removeEmpty) {
        lines = lines.filter(line => line.trim());
    }
    
    // 去除重复
    if (unique) {
        if (ignoreCase) {
            const seen = new Set();
            lines = lines.filter(line => {
                const lower = line.toLowerCase();
                if (seen.has(lower)) return false;
                seen.add(lower);
                return true;
            });
        } else {
            lines = [...new Set(lines)];
        }
    }
    
    // 排序
    if (order === 'random') {
        lines.sort(() => Math.random() - 0.5);
    } else {
        const isDesc = order === 'desc';
        
        if (type === 'alpha') {
            lines.sort((a, b) => {
                const av = ignoreCase ? a.toLowerCase() : a;
                const bv = ignoreCase ? b.toLowerCase() : b;
                const cmp = av.localeCompare(bv);
                return isDesc ? -cmp : cmp;
            });
        } else if (type === 'numeric') {
            lines.sort((a, b) => {
                const av = parseFloat(a) || 0;
                const bv = parseFloat(b) || 0;
                return isDesc ? bv - av : av - bv;
            });
        } else if (type === 'length') {
            lines.sort((a, b) => {
                return isDesc ? b.length - a.length : a.length - b.length;
            });
        }
    }
    
    document.getElementById('sort-output').value = lines.join('\n');
}

// ==================== 工具9: JSON格式化 ====================
function formatJson() {
    const input = document.getElementById('json-input').value;
    const indent = document.getElementById('json-indent').value;
    
    try {
        const data = JSON.parse(input);
        let formatted;
        
        if (indent === 'tab') {
            formatted = JSON.stringify(data, null, '\t');
        } else {
            formatted = JSON.stringify(data, null, parseInt(indent));
        }
        
        document.getElementById('json-output').value = formatted;
        showJsonStatus('✓ 格式化成功', 'success');
    } catch (e) {
        showJsonStatus('✗ JSON格式错误: ' + e.message, 'error');
    }
}

function minifyJson() {
    const input = document.getElementById('json-input').value;
    
    try {
        const data = JSON.parse(input);
        const minified = JSON.stringify(data);
        document.getElementById('json-output').value = minified;
        
        const originalSize = input.length;
        const minifiedSize = minified.length;
        const reduction = ((1 - minifiedSize / originalSize) * 100).toFixed(1);
        
        showJsonStatus(`✓ 压缩成功 - 减少 ${reduction}%`, 'success');
    } catch (e) {
        showJsonStatus('✗ JSON格式错误: ' + e.message, 'error');
    }
}

function validateJson() {
    const input = document.getElementById('json-input').value;
    
    try {
        const data = JSON.parse(input);
        let info = '✓ JSON有效\n';
        
        if (Array.isArray(data)) {
            info += `类型: 数组, 元素数: ${data.length}`;
        } else if (typeof data === 'object') {
            info += `类型: 对象, 键数: ${Object.keys(data).length}`;
        } else {
            info += `类型: ${typeof data}`;
        }
        
        showJsonStatus(info, 'success');
        document.getElementById('json-output').value = JSON.stringify(data, null, 2);
    } catch (e) {
        showJsonStatus('✗ JSON格式错误: ' + e.message, 'error');
    }
}

function showJsonStatus(msg, type) {
    const status = document.getElementById('json-status');
    status.textContent = msg;
    status.className = 'json-status ' + type;
}

// ==================== 通用功能 ====================
function copyResult(elementId) {
    const element = document.getElementById(elementId);
    const text = element.value;
    
    if (!text) {
        alert('没有可复制的内容');
        return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板');
    }).catch(err => {
        // 备用方法
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('已复制到剪贴板');
    });
}

function clearText(tool) {
    const prefix = tool;
    
    document.querySelectorAll(`[id^="${prefix}-input"]`).forEach(el => {
        el.value = '';
    });
    document.querySelectorAll(`[id^="${prefix}-output"]`).forEach(el => {
        el.value = '';
    });
    
    // 如果是计数工具，重新计算
    if (tool === 'count') {
        countChars();
    }
    
    // 清除JSON状态
    if (tool === 'json') {
        document.getElementById('json-status').textContent = '';
        document.getElementById('json-status').className = 'json-status';
    }
}
