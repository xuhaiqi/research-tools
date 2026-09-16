// 科研计算增强工具。所有计算均在浏览器本地完成，不上传输入数据。
(function () {
    'use strict';

    const byId = id => document.getElementById(id);
    const fmt = value => Number.isFinite(value) ? Number(value.toPrecision(12)).toString() : String(value);

    function parseNumbers(text) {
        const parts = String(text).trim().split(/[\s,，;；]+/).filter(Boolean);
        if (!parts.length) throw new Error('请输入至少一个数值。');
        const values = parts.map(item => Number(item));
        if (values.some(value => !Number.isFinite(value))) throw new Error('数据中包含无法识别的数值。');
        return values;
    }

    function quantile(sorted, p) {
        if (sorted.length === 1) return sorted[0];
        const position = (sorted.length - 1) * p;
        const lower = Math.floor(position);
        const fraction = position - lower;
        return sorted[lower] + (sorted[Math.min(lower + 1, sorted.length - 1)] - sorted[lower]) * fraction;
    }

    function setStatus(prefix, message, type = '') {
        const element = byId(`${prefix}-status`);
        element.textContent = message;
        element.className = `research-status${type ? ` ${type}` : ''}`;
    }

    async function copyOutput(prefix) {
        const text = byId(`${prefix}-output`).textContent;
        if (!text || /等待/.test(text)) throw new Error('请先生成结果。');
        try { await navigator.clipboard.writeText(text); }
        catch {
            const area = document.createElement('textarea');
            area.value = text; document.body.append(area); area.select(); document.execCommand('copy'); area.remove();
        }
        setStatus(prefix, '结果已复制。', 'success');
    }

    function bindCommon(prefix, run, inputIds, waitingText) {
        byId(`${prefix}-run`).addEventListener('click', run);
        byId(`${prefix}-copy`).addEventListener('click', () => copyOutput(prefix).catch(error => setStatus(prefix, error.message, 'error')));
        byId(`${prefix}-clear`).addEventListener('click', () => {
            inputIds.forEach(id => { byId(id).value = ''; });
            byId(`${prefix}-output`).textContent = waitingText;
            setStatus(prefix, '');
        });
    }

    function initStatistics() {
        if (!byId('statistics-input')) return;
        const run = () => {
            try {
                const values = parseNumbers(byId('statistics-input').value);
                const sorted = [...values].sort((a, b) => a - b);
                const n = values.length;
                const sum = values.reduce((a, b) => a + b, 0);
                const mean = sum / n;
                const sample = byId('statistics-sample').checked;
                if (sample && n < 2) throw new Error('样本方差至少需要两个数值。');
                const variance = values.reduce((acc, value) => acc + (value - mean) ** 2, 0) / (sample ? n - 1 : n);
                const lines = [
                    `样本量 n       = ${n}`, `总和           = ${fmt(sum)}`, `均值           = ${fmt(mean)}`,
                    `中位数         = ${fmt(quantile(sorted, .5))}`, `最小值         = ${fmt(sorted[0])}`,
                    `第一四分位数 Q1 = ${fmt(quantile(sorted, .25))}`, `第三四分位数 Q3 = ${fmt(quantile(sorted, .75))}`,
                    `最大值         = ${fmt(sorted[n - 1])}`, `极差           = ${fmt(sorted[n - 1] - sorted[0])}`,
                    `${sample ? '样本' : '总体'}方差       = ${fmt(variance)}`, `${sample ? '样本' : '总体'}标准差     = ${fmt(Math.sqrt(variance))}`
                ];
                byId('statistics-output').textContent = lines.join('\n');
                setStatus('statistics', '计算完成。', 'success');
            } catch (error) { setStatus('statistics', error.message, 'error'); }
        };
        bindCommon('statistics', run, ['statistics-input'], '等待计算…');
    }

    function linearRegression(xs, ys) {
        if (xs.length !== ys.length) throw new Error('X 与 Y 的数据数量必须相同。');
        if (xs.length < 2) throw new Error('线性拟合至少需要两组数据。');
        const n = xs.length;
        const meanX = xs.reduce((a, b) => a + b, 0) / n;
        const meanY = ys.reduce((a, b) => a + b, 0) / n;
        const sxx = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
        if (sxx === 0) throw new Error('X 数据不能全部相同。');
        const syy = ys.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
        const sxy = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0);
        const slope = sxy / sxx;
        const intercept = meanY - slope * meanX;
        const predictions = xs.map(x => slope * x + intercept);
        const sse = ys.reduce((sum, y, i) => sum + (y - predictions[i]) ** 2, 0);
        const r2 = syy === 0 ? 1 : 1 - sse / syy;
        const r = syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
        return { slope, intercept, r2, r, sse, predictions };
    }

    function drawRegression(xs, ys, result) {
        const canvas = byId('regression-chart');
        const ctx = canvas.getContext('2d');
        const ratio = window.devicePixelRatio || 1;
        const width = Math.max(560, canvas.clientWidth || 900), height = 420;
        canvas.width = width * ratio; canvas.height = height * ratio; ctx.scale(ratio, ratio);
        const pad = 55;
        let minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys, ...result.predictions), maxY = Math.max(...ys, ...result.predictions);
        const dx = maxX - minX || 1, dy = maxY - minY || 1;
        minX -= dx * .08; maxX += dx * .08; minY -= dy * .12; maxY += dy * .12;
        const sx = x => pad + (x - minX) / (maxX - minX) * (width - pad * 1.5);
        const sy = y => height - pad - (y - minY) / (maxY - minY) * (height - pad * 1.5);
        ctx.clearRect(0, 0, width, height); ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad, 20); ctx.lineTo(pad, height - pad); ctx.lineTo(width - 20, height - pad); ctx.stroke();
        ctx.fillStyle = '#64748b'; ctx.font = '13px sans-serif'; ctx.fillText(fmt(minX), pad - 10, height - 28); ctx.fillText(fmt(maxX), width - 70, height - 28); ctx.fillText(fmt(maxY), 6, 28); ctx.fillText(fmt(minY), 6, height - pad);
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx(minX), sy(result.slope * minX + result.intercept)); ctx.lineTo(sx(maxX), sy(result.slope * maxX + result.intercept)); ctx.stroke();
        ctx.fillStyle = '#2563eb'; xs.forEach((x, i) => { ctx.beginPath(); ctx.arc(sx(x), sy(ys[i]), 4.5, 0, Math.PI * 2); ctx.fill(); });
        canvas.classList.add('visible');
    }

    function initRegression() {
        if (!byId('regression-x')) return;
        const run = () => {
            try {
                const xs = parseNumbers(byId('regression-x').value), ys = parseNumbers(byId('regression-y').value);
                const result = linearRegression(xs, ys);
                byId('regression-output').textContent = [`样本量 n = ${xs.length}`, `拟合方程：y = ${fmt(result.slope)}x ${result.intercept < 0 ? '−' : '+'} ${fmt(Math.abs(result.intercept))}`, `决定系数 R² = ${fmt(result.r2)}`, `相关系数 r  = ${Number.isNaN(result.r) ? '未定义（Y 无变化）' : fmt(result.r)}`, `残差平方和 SSE = ${fmt(result.sse)}`].join('\n');
                drawRegression(xs, ys, result); setStatus('regression', '拟合完成。', 'success');
            } catch (error) { byId('regression-chart').classList.remove('visible'); setStatus('regression', error.message, 'error'); }
        };
        bindCommon('regression', run, ['regression-x', 'regression-y'], '等待拟合…');
    }

    class ExpressionParser {
        constructor(text, degrees) { this.text = text.replace(/×/g, '*').replace(/÷/g, '/'); this.pos = 0; this.degrees = degrees; }
        parse() { const value = this.expression(); this.skip(); if (this.pos !== this.text.length) throw new Error(`无法识别位置 ${this.pos + 1} 附近的内容。`); if (!Number.isFinite(value)) throw new Error('结果不是有限数值。'); return value; }
        skip() { while (/\s/.test(this.text[this.pos] || '')) this.pos++; }
        eat(char) { this.skip(); if (this.text.startsWith(char, this.pos)) { this.pos += char.length; return true; } return false; }
        expression() { let value = this.term(); while (true) { if (this.eat('+')) value += this.term(); else if (this.eat('-')) value -= this.term(); else return value; } }
        term() { let value = this.unary(); while (true) { if (this.eat('*')) value *= this.unary(); else if (this.eat('/')) { const divisor = this.unary(); if (divisor === 0) throw new Error('除数不能为零。'); value /= divisor; } else return value; } }
        unary() { if (this.eat('+')) return this.unary(); if (this.eat('-')) return -this.unary(); return this.power(); }
        power() { let value = this.primary(); if (this.eat('^') || this.eat('**')) value **= this.unary(); return value; }
        primary() {
            this.skip();
            if (this.eat('(')) { const value = this.expression(); if (!this.eat(')')) throw new Error('缺少右括号。'); return value; }
            const number = this.text.slice(this.pos).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
            if (number) { this.pos += number[0].length; return Number(number[0]); }
            const name = this.text.slice(this.pos).match(/^[A-Za-z_]+/);
            if (!name) throw new Error(`位置 ${this.pos + 1} 需要数值、函数或左括号。`);
            this.pos += name[0].length; const key = name[0].toLowerCase();
            if (key === 'pi') return Math.PI; if (key === 'e') return Math.E;
            if (!this.eat('(')) throw new Error(`函数 ${key} 后需要括号。`);
            const arg = this.expression(); if (!this.eat(')')) throw new Error('缺少右括号。');
            const rad = value => this.degrees ? value * Math.PI / 180 : value;
            const angleOut = value => this.degrees ? value * 180 / Math.PI : value;
            const functions = { sqrt: Math.sqrt, sin: v => Math.sin(rad(v)), cos: v => Math.cos(rad(v)), tan: v => Math.tan(rad(v)), asin: v => angleOut(Math.asin(v)), acos: v => angleOut(Math.acos(v)), atan: v => angleOut(Math.atan(v)), log: Math.log10, ln: Math.log, exp: Math.exp, abs: Math.abs };
            if (!functions[key]) throw new Error(`不支持函数 ${key}。`);
            const value = functions[key](arg); if (!Number.isFinite(value)) throw new Error(`函数 ${key} 的参数超出定义域。`); return value;
        }
    }

    function initExpression() {
        if (!byId('expression-input')) return;
        const run = () => { try { const result = new ExpressionParser(byId('expression-input').value, byId('expression-degrees').checked).parse(); byId('expression-output').textContent = `结果 = ${fmt(result)}`; setStatus('expression', '计算完成。', 'success'); } catch (error) { setStatus('expression', error.message, 'error'); } };
        bindCommon('expression', run, ['expression-input'], '等待计算…'); byId('expression-input').addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    }

    function roundHalfEven(value, digits) {
        const factor = 10 ** digits;
        const scaled = value * factor;
        const floor = Math.floor(scaled);
        const fraction = scaled - floor;
        const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 4;
        if (Math.abs(fraction - .5) <= tolerance) return (floor % 2 === 0 ? floor : floor + 1) / factor;
        return Math.round(scaled) / factor;
    }

    function initSignificant() {
        if (!byId('significant-input')) return;
        const run = () => {
            try {
                const values = parseNumbers(byId('significant-input').value), places = Number(byId('significant-places').value), mode = byId('significant-mode').value;
                if (!Number.isInteger(places) || places < 0 || places > 15 || (mode === 'significant' && places === 0)) throw new Error('位数必须在允许范围内；有效数字至少为 1 位。');
                const lines = values.map(value => {
                    let decimals = places;
                    if (mode === 'significant' && value !== 0) decimals = places - Math.floor(Math.log10(Math.abs(value))) - 1;
                    const rounded = roundHalfEven(value, decimals);
                    const shown = decimals >= 0 && decimals <= 15 ? rounded.toFixed(decimals) : rounded.toExponential(Math.max(0, places - 1));
                    return `${value}  →  ${shown}`;
                });
                byId('significant-output').textContent = lines.join('\n'); setStatus('significant', `已修约 ${values.length} 个数值。`, 'success');
            } catch (error) { setStatus('significant', error.message, 'error'); }
        };
        bindCommon('significant', run, ['significant-input'], '等待修约…');
    }

    function initErrorAnalysis() {
        if (!byId('error-observed')) return;
        const run = () => {
            try {
                const observed = parseNumbers(byId('error-observed').value), reference = parseNumbers(byId('error-reference').value);
                if (observed.length !== reference.length) throw new Error('测量值与参考值的数量必须相同。');
                const errors = observed.map((value, i) => value - reference[i]);
                const n = errors.length, bias = errors.reduce((a, b) => a + b, 0) / n;
                const mae = errors.reduce((sum, value) => sum + Math.abs(value), 0) / n;
                const rmse = Math.sqrt(errors.reduce((sum, value) => sum + value ** 2, 0) / n);
                const relative = errors.map((value, i) => reference[i] === 0 ? null : Math.abs(value / reference[i]) * 100);
                const valid = relative.filter(value => value !== null);
                const lines = [`数据对 n = ${n}`, `平均偏差 Bias = ${fmt(bias)}`, `平均绝对误差 MAE = ${fmt(mae)}`, `均方根误差 RMSE = ${fmt(rmse)}`, `平均绝对百分比误差 MAPE = ${valid.length ? `${fmt(valid.reduce((a, b) => a + b, 0) / valid.length)}%` : '未定义'}`, '', '序号\t绝对误差\t相对误差'];
                errors.forEach((error, i) => lines.push(`${i + 1}\t${fmt(Math.abs(error))}\t${relative[i] === null ? '参考值为 0' : `${fmt(relative[i])}%`}`));
                byId('error-output').textContent = lines.join('\n'); setStatus('error', valid.length < n ? '分析完成；参考值为 0 的数据未计入 MAPE。' : '分析完成。', 'success');
            } catch (error) { setStatus('error', error.message, 'error'); }
        };
        bindCommon('error', run, ['error-observed', 'error-reference'], '等待分析…');
    }

    document.addEventListener('DOMContentLoaded', () => { initStatistics(); initRegression(); initExpression(); initSignificant(); initErrorAnalysis(); });
}());
