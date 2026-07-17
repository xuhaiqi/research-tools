// 进制转换与不同进制整数计算器。使用 BigInt 避免普通 Number 的精度损失。
(function () {
    const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function validateBase(rawBase) {
        const base = Number(rawBase);
        if (!Number.isInteger(base) || base < 2 || base > 36) {
            throw new Error('进制必须是 2 到 36 之间的整数。');
        }
        return base;
    }

    function parseBaseInteger(rawValue, rawBase) {
        const base = validateBase(rawBase);
        let text = String(rawValue).trim().toUpperCase();
        if (!text) throw new Error('请输入整数。');

        let sign = 1n;
        if (text[0] === '+' || text[0] === '-') {
            sign = text[0] === '-' ? -1n : 1n;
            text = text.slice(1);
        }
        if (!text) throw new Error('正负号后必须包含数字。');

        let value = 0n;
        const bigBase = BigInt(base);
        for (const char of text) {
            const digit = DIGITS.indexOf(char);
            if (digit < 0 || digit >= base) {
                throw new Error(`字符“${char}”不是有效的 ${base} 进制数字。`);
            }
            value = value * bigBase + BigInt(digit);
        }
        return sign * value;
    }

    function formatBaseInteger(rawValue, rawBase) {
        const base = validateBase(rawBase);
        let value = BigInt(rawValue);
        if (value === 0n) return '0';

        const sign = value < 0n ? '-' : '';
        if (value < 0n) value = -value;
        const bigBase = BigInt(base);
        const result = [];
        while (value > 0n) {
            result.push(DIGITS[Number(value % bigBase)]);
            value /= bigBase;
        }
        return sign + result.reverse().join('');
    }

    async function copyValue(value, statusElement) {
        if (!value) throw new Error('请先生成结果。');
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.append(textarea);
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }
        setStatus(statusElement, '结果已复制。', 'success');
    }

    function setStatus(element, message, type = '') {
        element.textContent = message;
        element.className = `base-status${type ? ' ' + type : ''}`;
    }

    function initBaseConverter() {
        const input = document.getElementById('base-convert-input');
        if (!input) return;
        const fromBase = document.getElementById('base-convert-from');
        const toBase = document.getElementById('base-convert-to');
        const output = document.getElementById('base-convert-output');
        const detail = document.getElementById('base-convert-detail');
        const status = document.getElementById('base-convert-status');

        function convert() {
            try {
                const value = parseBaseInteger(input.value, fromBase.value);
                output.value = formatBaseInteger(value, toBase.value);
                detail.textContent = `十进制值：${value}`;
                setStatus(status, '转换成功。', 'success');
            } catch (error) {
                output.value = '';
                detail.textContent = '十进制值：';
                setStatus(status, error.message, 'error');
            }
        }

        document.getElementById('base-convert-run').addEventListener('click', convert);
        document.getElementById('base-convert-swap').addEventListener('click', () => {
            const oldFrom = fromBase.value;
            fromBase.value = toBase.value;
            toBase.value = oldFrom;
            if (output.value) input.value = output.value;
            convert();
        });
        document.getElementById('base-convert-copy').addEventListener('click', () => {
            copyValue(output.value, status).catch(error => setStatus(status, error.message, 'error'));
        });
        document.getElementById('base-convert-clear').addEventListener('click', () => {
            input.value = '';
            output.value = '';
            detail.textContent = '十进制值：';
            setStatus(status, '');
            input.focus();
        });
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') convert();
        });
    }

    function initBaseCalculator() {
        const leftInput = document.getElementById('base-calc-left');
        if (!leftInput) return;
        const leftBase = document.getElementById('base-calc-left-base');
        const operator = document.getElementById('base-calc-operator');
        const rightInput = document.getElementById('base-calc-right');
        const rightBase = document.getElementById('base-calc-right-base');
        const resultBase = document.getElementById('base-calc-result-base');
        const output = document.getElementById('base-calc-output');
        const detail = document.getElementById('base-calc-detail');
        const status = document.getElementById('base-calc-status');

        function calculate() {
            try {
                const left = parseBaseInteger(leftInput.value, leftBase.value);
                const right = parseBaseInteger(rightInput.value, rightBase.value);
                let result;
                let remainder = null;
                if (operator.value === '+') result = left + right;
                else if (operator.value === '-') result = left - right;
                else if (operator.value === '*') result = left * right;
                else if (operator.value === '/' || operator.value === '%') {
                    if (right === 0n) throw new Error('除数不能为零。');
                    const quotient = left / right;
                    remainder = left - quotient * right;
                    result = operator.value === '/' ? quotient : remainder;
                } else throw new Error('请选择有效的运算符。');

                const formatted = formatBaseInteger(result, resultBase.value);
                output.value = formatted;
                if (operator.value === '/') {
                    output.value += `（余数 ${formatBaseInteger(remainder, resultBase.value)}）`;
                }
                const symbols = { '*': '×', '/': '÷' };
                const displayOperator = symbols[operator.value] || operator.value;
                detail.textContent = `十进制校验：${left} ${displayOperator} ${right} = ${result}`
                    + (operator.value === '/' ? `，余数 ${remainder}` : '');
                setStatus(status, '计算成功。', 'success');
            } catch (error) {
                output.value = '';
                detail.textContent = '十进制校验：';
                setStatus(status, error.message, 'error');
            }
        }

        document.getElementById('base-calc-run').addEventListener('click', calculate);
        document.getElementById('base-calc-swap').addEventListener('click', () => {
            const oldValue = leftInput.value;
            const oldBase = leftBase.value;
            leftInput.value = rightInput.value;
            leftBase.value = rightBase.value;
            rightInput.value = oldValue;
            rightBase.value = oldBase;
        });
        document.getElementById('base-calc-copy').addEventListener('click', () => {
            copyValue(output.value, status).catch(error => setStatus(status, error.message, 'error'));
        });
        document.getElementById('base-calc-clear').addEventListener('click', () => {
            leftInput.value = '';
            rightInput.value = '';
            output.value = '';
            detail.textContent = '十进制校验：';
            setStatus(status, '');
            leftInput.focus();
        });
        [leftInput, rightInput].forEach(element => element.addEventListener('keydown', event => {
            if (event.key === 'Enter') calculate();
        }));
    }

    document.addEventListener('DOMContentLoaded', () => {
        initBaseConverter();
        initBaseCalculator();
    });
}());
