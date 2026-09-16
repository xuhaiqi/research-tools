// 化学与燃烧研究工具。计算模型与 docs/COMBUSTION_TOOL_MODELS.md 保持一致。
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const fmt = value => Number.isFinite(value) ? Number(value.toPrecision(12)).toString() : String(value);
    const ATOMIC = { C: 12.011, H: 1.008, O: 15.999, N: 14.007, S: 32.06 };
    const R = 8.31446261815324;

    function number(id) {
        const value = Number($(id).value);
        if (!Number.isFinite(value)) throw new Error('请填写有效的有限数值。');
        return value;
    }
    function status(prefix, message, type = '') { const node = $(`${prefix}-status`); node.textContent = message; node.className = `combustion-status${type ? ` ${type}` : ''}`; }
    async function copy(prefix) {
        const text = $(`${prefix}-output`).textContent;
        if (!text || text.startsWith('等待')) throw new Error('请先生成结果。');
        try { await navigator.clipboard.writeText(text); }
        catch { const area = document.createElement('textarea'); area.value = text; document.body.append(area); area.select(); document.execCommand('copy'); area.remove(); }
        status(prefix, '报告已复制。', 'success');
    }
    function bind(prefix, run) { $(`${prefix}-run`).addEventListener('click', run); $(`${prefix}-copy`).addEventListener('click', () => copy(prefix).catch(error => status(prefix, error.message, 'error'))); }

    function parseFormula(raw) {
        const text = String(raw).trim().replace(/\s/g, '');
        if (!text) throw new Error('请输入燃料化学式。');
        const result = { C: 0, H: 0, O: 0, N: 0, S: 0 }; let position = 0; const pattern = /([A-Z][a-z]?)(\d+(?:\.\d*)?|\.\d+)?/g; let match;
        while ((match = pattern.exec(text))) {
            if (match.index !== position || !(match[1] in result)) throw new Error('仅支持由 C、H、O、N、S 组成的化学式。');
            const amount = Number(match[2] || 1); if (!(amount > 0)) throw new Error('元素下标必须是正数。');
            result[match[1]] += amount; position = pattern.lastIndex;
        }
        if (position !== text.length || !Object.values(result).some(Boolean)) throw new Error('化学式格式无效。');
        return result;
    }

    function initCombustion() {
        if (!$('combustion-formula')) return;
        $('combustion-preset').addEventListener('change', () => { $('combustion-formula').value = $('combustion-preset').value; });
        const run = () => {
            try {
                const formula = $('combustion-formula').value, c = parseFormula(formula), phi = number('combustion-phi'), oxygen = number('combustion-air-o2');
                if (!(phi > 0)) throw new Error('当量比必须大于零。'); if (!(oxygen > 0 && oxygen < 100)) throw new Error('助燃气 O₂ 必须在 0% 到 100% 之间。');
                const o2st = c.C + c.H / 4 + c.S - c.O / 2; if (!(o2st > 0)) throw new Error('净理论需氧量不为正，不适用本模型。');
                const ratio = (100 - oxygen) / oxygen, o2actual = o2st / phi, mw = Object.keys(ATOMIC).reduce((sum, key) => sum + c[key] * ATOMIC[key], 0);
                const afr = o2st * (31.998 + ratio * 28.014) / mw;
                const lines = [`燃料：${formula}  M = ${fmt(mw)} g/mol`, `理论 O₂：${fmt(o2st)} mol/mol fuel`, `实际 O₂：${fmt(o2actual)} mol/mol fuel`, `当量比 φ = ${fmt(phi)}；过量空气系数 λ = ${fmt(1 / phi)}`, `理论空燃比 AFR = ${fmt(afr)} kg oxidizer/kg fuel`, `实际空燃比 AFR = ${fmt(afr / phi)} kg oxidizer/kg fuel`];
                if (phi > 1) lines.push(`供氧缺口：${fmt(o2st - o2actual)} mol O₂/mol fuel`, '警告：φ > 1。元素守恒不能唯一确定 CO、H₂和未燃燃料分配，因此不报告虚构的产物组成。');
                else {
                    const products = { CO2: c.C, H2O: c.H / 2, SO2: c.S, O2: o2actual - o2st, N2: c.N / 2 + ratio * o2actual };
                    Object.keys(products).forEach(key => { if (products[key] <= 1e-14) delete products[key]; });
                    const wetTotal = Object.values(products).reduce((a, b) => a + b, 0), dryTotal = wetTotal - (products.H2O || 0);
                    lines.push(`反应式：1 ${formula} + ${fmt(o2actual)} O₂ + ${fmt(ratio * o2actual)} N₂ → ` + Object.entries(products).map(([key, value]) => `${fmt(value)} ${key}`).join(' + '), '', '理论烟气组成（湿基 / 干基）：');
                    Object.entries(products).forEach(([key, value]) => lines.push(`${key}: ${fmt(value / wetTotal * 100)}% / ${key === 'H2O' ? '—' : fmt(value / dryTotal * 100) + '%'}`));
                }
                $('combustion-output').textContent = lines.join('\n'); status('combustion', '计算完成。', 'success');
            } catch (error) { status('combustion', error.message, 'error'); }
        }; bind('combustion', run);
    }

    function initFlue() {
        if (!$('flue-concentration')) return;
        const run = () => {
            try {
                const concentration = number('flue-concentration'), water = number('flue-water'), measured = number('flue-o2'), reference = number('flue-reference-o2'), air = number('flue-air-o2'), basis = $('flue-basis').value;
                if (concentration < 0) throw new Error('浓度不能为负。'); if (!(water >= 0 && water < 100)) throw new Error('水蒸气必须在 0% 到 100% 之间。'); if (!(reference >= 0 && reference < air && air > 0 && air <= 100)) throw new Error('目标 O₂ 必须低于助燃气 O₂。');
                const dryFactor = 1 - water / 100, dry = basis === 'wet' ? concentration / dryFactor : concentration, wet = basis === 'wet' ? concentration : concentration * dryFactor, dryO2 = basis === 'wet' ? measured / dryFactor : measured;
                if (!(dryO2 >= 0 && dryO2 < air)) throw new Error('换算后的干基 O₂ 必须低于助燃气 O₂。');
                const factor = (air - reference) / (air - dryO2), symbol = $('flue-unit').value === 'ppm' ? 'ppm' : '%';
                $('flue-output').textContent = [`湿基浓度：${fmt(wet)} ${symbol}`, `干基浓度：${fmt(dry)} ${symbol}`, `干基 O₂：${fmt(dryO2)}%`, `氧修正系数：${fmt(factor)}`, `修正至 ${fmt(reference)}% O₂（干基）：${fmt(dry * factor)} ${symbol}`, '说明：污染物与 O₂ 已统一到干基后再进行氧基准修正。'].join('\n');
                status('flue', '换算完成。', 'success');
            } catch (error) { status('flue', error.message, 'error'); }
        }; bind('flue', run);
    }

    function initEmission() {
        if (!$('emission-concentration')) return;
        $('emission-species').addEventListener('change', event => { $('emission-mw').value = event.target.selectedOptions[0].dataset.mw; });
        const run = () => {
            try {
                const concentration = number('emission-concentration'), mw = number('emission-mw'), tempC = number('emission-temperature'), pressure = number('emission-pressure'), flow = number('emission-flow'), power = number('emission-power');
                if (concentration < 0 || !(mw > 0) || !(pressure > 0) || flow < 0 || power < 0 || !(tempC > -273.15)) throw new Error('请检查浓度、分子量、绝对温度、压力、流量和功率范围。');
                const temp = tempC + 273.15, factor = mw * pressure * 1000 / (R * temp) * 1e-3, ppm = $('emission-unit').value === 'ppm' ? concentration : concentration / factor, mg = $('emission-unit').value === 'ppm' ? concentration * factor : concentration, gs = mg * flow / 1000;
                const lines = [`参考状态：${fmt(tempC)} °C，${fmt(pressure)} kPa(abs)`, `理想气体摩尔体积：${fmt(R * temp / pressure)} m³/kmol`, `浓度：${fmt(ppm)} ppmv`, `浓度：${fmt(mg)} mg/m³`];
                if (flow > 0) lines.push(`质量流率：${fmt(gs)} g/s`, `质量流率：${fmt(gs * 3.6)} kg/h`); if (power > 0) lines.push(`比排放：${fmt(gs * 3600 / power)} g/kWh`);
                lines.push('注意：浓度与体积流量必须处于相同温度、压力和干湿基准。'); $('emission-output').textContent = lines.join('\n'); status('emission', '换算完成。', 'success');
            } catch (error) { status('emission', error.message, 'error'); }
        }; bind('emission', run);
    }

    function initFuel() {
        if (!$('fuel-c')) return;
        const run = () => {
            try {
                const basis = $('fuel-basis').value, moisture = number('fuel-moisture'), ash = number('fuel-ash'), oxygenAir = number('fuel-air-o2'), values = { C:number('fuel-c'), H:number('fuel-h'), O:number('fuel-o'), N:number('fuel-n'), S:number('fuel-s') };
                if (Object.values(values).some(v => v < 0) || moisture < 0 || ash < 0 || moisture >= 100 || ash >= 100) throw new Error('元素、水分和灰分必须处于有效非负范围。');
                let ar, ashAr; const sum = Object.values(values).reduce((a,b)=>a+b,0);
                if (basis === 'ar') { if (sum + moisture + ash > 100.001) throw new Error('收到基总和不能超过 100%。'); ar = values; ashAr = ash; }
                else if (basis === 'dry') { if (sum + ash > 100.001) throw new Error('干基总和不能超过 100%。'); const factor=1-moisture/100; ar=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v*factor])); ashAr=ash*factor; }
                else { if (sum > 100.001 || moisture + ash >= 100) throw new Error('daf 元素总和或收到基水分+灰分无效。'); const factor=1-(moisture+ash)/100; ar=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v*factor])); ashAr=ash; }
                const dryFraction=1-moisture/100, dafFraction=1-(moisture+ashAr)/100; if (!(dafFraction>0) || !(ar.C>0) || !(oxygenAir>0&&oxygenAir<100)) throw new Error('C、干燥无灰分数或助燃气 O₂ 无效。');
                const dry=Object.fromEntries(Object.entries(ar).map(([k,v])=>[k,v/dryFraction])), daf=Object.fromEntries(Object.entries(ar).map(([k,v])=>[k,v/dafFraction]));
                const atoms=Object.fromEntries(Object.entries(ar).map(([k,v])=>[k,v/100/ATOMIC[k]])), ratios={H:atoms.H/atoms.C,O:atoms.O/atoms.C,N:atoms.N/atoms.C,S:atoms.S/atoms.C};
                const o2=atoms.C+atoms.H/4+atoms.S-atoms.O/2; if (!(o2>0)) throw new Error('净理论需氧量不为正。'); const n2o2=(100-oxygenAir)/oxygenAir;
                const lines=['元素组成（收到基 / 干基 / 干燥无灰基，wt%）：']; Object.keys(ATOMIC).forEach(k=>lines.push(`${k}: ${fmt(ar[k])} / ${fmt(dry[k])} / ${fmt(daf[k])}`));
                lines.push(`水分（收到基）：${fmt(moisture)}%`,`灰分（收到基 / 干基）：${fmt(ashAr)}% / ${fmt(ashAr/dryFraction)}%`,`C=1 归一化经验式：CH${fmt(ratios.H)}O${fmt(ratios.O)}N${fmt(ratios.N)}S${fmt(ratios.S)}`,`理论需氧量：${fmt(o2)} kmol O₂/kg fuel`,`理论需氧量：${fmt(o2*31.998)} kg O₂/kg fuel`,`理论助燃气量：${fmt(o2*(31.998+n2o2*28.014))} kg/kg fuel`);
                const unaccounted=Math.max(0,100-(Object.values(ar).reduce((a,b)=>a+b,0)+moisture+ashAr)); if(unaccounted>1e-8) lines.push(`未计入组分：${fmt(unaccounted)}%（未参与需氧量计算）`);
                $('fuel-output').textContent=lines.join('\n'); status('fuel','计算完成。','success');
            } catch(error){status('fuel',error.message,'error');}
        }; bind('fuel',run);
    }

    function initHeating() {
        if (!$('heating-c')) return;
        const run = () => {
            try {
                const c=number('heating-c'),h=number('heating-h'),o=number('heating-o'),s=number('heating-s'),moisture=number('heating-moisture'),hfg=number('heating-hfg'),flow=number('heating-flow');
                if([c,h,o,s,moisture,flow].some(v=>v<0)||c+h+o+s>100.001||moisture>=100||!(hfg>0)) throw new Error('请检查干基元素、水分、潜热和流量范围。');
                const dryFraction=1-moisture/100, raw=$('heating-hhv').value.trim(); let hhvDry,source,estimated;
                if(!raw){hhvDry=.3383*c+1.422*(h-o/8)+.095*s;source='Dulong 经验估算';estimated=true;}
                else{const measured=Number(raw);if(!Number.isFinite(measured)||!(measured>0))throw new Error('实测 HHV 必须为正有限数值。');hhvDry=$('heating-basis').value==='dry'?measured:measured/dryFraction;source='用户输入实测值';estimated=false;}
                const hhvAr=hhvDry*dryFraction,waterAr=9*h/100*dryFraction+moisture/100,lhvDry=hhvDry-hfg*9*h/100,lhvAr=hhvAr-hfg*waterAr;if(Math.min(hhvDry,hhvAr,lhvDry,lhvAr)<=0)throw new Error('计算热值不为正，请检查输入。');
                const lines=[`HHV 来源：${source}`,`HHV（干基）：${fmt(hhvDry)} MJ/kg`,`HHV（收到基）：${fmt(hhvAr)} MJ/kg`,`LHV（干基）：${fmt(lhvDry)} MJ/kg`,`LHV（收到基）：${fmt(lhvAr)} MJ/kg`,`收到基需扣除水量：${fmt(waterAr)} kg water/kg fuel`];
                if(flow>0){const kgS=flow/3600;lines.push(`燃料流量：${fmt(flow)} kg/h`,`HHV 热输入：${fmt(kgS*hhvAr)} MW`,`LHV 热输入：${fmt(kgS*lhvAr)} MW`);}if(estimated)lines.push('警告：Dulong 是经验估算，不替代量热仪实测值，特殊燃料可能有明显偏差。');
                $('heating-output').textContent=lines.join('\n');status('heating','计算完成。','success');
            } catch(error){status('heating',error.message,'error');}
        }; bind('heating',run);
    }

    document.addEventListener('DOMContentLoaded', () => { initCombustion(); initFlue(); initEmission(); initFuel(); initHeating(); });
}());
