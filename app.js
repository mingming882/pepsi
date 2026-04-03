/**
 * 杭州百事喷码生成器 - 主逻辑
 * 优化版：代码解耦，逻辑清晰
 */

// ==================== 配置数据 ====================
const CONFIG = {
    // 生产线映射
    LINE_CODE_MAP: { "A": "1", "B": "2", "C": "3", "D": "4", "E": "5", "F": "6" },
    // 委托工厂代码映射
    FACTORY_CODE_MAP: {
        "SH": { code1: "S", code2: "H" },
        "AH": { code1: "A", code2: "H" },
        "WH": { code1: "W", code2: "H" },
        "NJ": { code1: "N", code2: "J" },
    },
    // 小时字母映射（缩短打印模式使用）
    HOUR_LETTER_MAP: {
        0: "A", 1: "B", 2: "C", 3: "D", 4: "E", 5: "F", 6: "G", 7: "H",
        8: "I", 9: "J", 10: "K", 11: "L", 12: "M", 13: "N", 14: "O",
        15: "P", 16: "Q", 17: "R", 18: "S", 19: "T", 20: "U", 21: "V",
        22: "W", 23: "X"
    },
    // 本厂固定代码
    FACTORY_CODE: "HZ",
    // 初始打印模式
    DEFAULT_PRINT_MODE: 'normal'
};

// ==================== 全局状态 ====================
let currentPrintMode = CONFIG.DEFAULT_PRINT_MODE;

// ==================== 工具函数 ====================
/**
 * 格式化日期时间为 YYYYMMDD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 根据打印模式获取时间字符串
 * @param {Date} date
 * @param {string} mode - 'normal' | 'short'
 * @returns {string}
 */
function getTimeString(date, mode) {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    if (mode === 'short') {
        const hourLetter = CONFIG.HOUR_LETTER_MAP[hours] || 'A';
        return `${hourLetter}${minutes}`; // 如 B30
    } else {
        // normal 模式
        return `${String(hours).padStart(2, '0')}:${minutes}`; // 如 01:30
    }
}

/**
 * 计算到期日期
 * 注意：根据业务规则，生产日期默认为"昨天"，在此基础上加保质期天数
 * @param {Date} baseDate - 基础日期（通常为当前时间）
 * @param {number} shelfLifeDays - 保质期天数
 * @returns {string} YYYYMMDD格式的日期字符串
 */
function calculateExpiryDate(baseDate, shelfLifeDays) {
    const targetDate = new Date(baseDate);
    // 关键业务规则：生产日期按前一天计算
    targetDate.setDate(targetDate.getDate() - 1 + parseInt(shelfLifeDays));
    return formatDate(targetDate);
}

/**
 * 生成瓶盖喷码
 * @param {Object} params
 * @returns {{line1: string, line2: string, parseData: Object}}
 */
function generateInnerCode(params) {
    const { prodDate, timeStr, expiryDate, factoryInfo, lineCode } = params;
    const line1 = `${prodDate} ${timeStr}${factoryInfo.code1 || ''}`;
    const line2 = `${expiryDate} ${CONFIG.FACTORY_CODE}${lineCode}${factoryInfo.code2 || ''}`;
    return {
        line1,
        line2,
        parseData: {
            prodDate,
            prodTime: timeStr,
            factoryCode1: factoryInfo.code1 || '(无)',
            expiryDate,
            factoryLine: `${CONFIG.FACTORY_CODE}${lineCode}`,
            factoryCode2: factoryInfo.code2 || '(无)'
        }
    };
}

/**
 * 生成膜包喷码
 * @param {Object} params
 * @returns {{line1: string, line2: string, parseData: Object}}
 */
function generateOuterCode(params) {
    const { prodDate, timeStr, expiryDate, factoryInfo, lineCode, qrOption } = params;
    const qualifier = qrOption === 'Y' ? ' ▣合格' : '合格';
    const line1 = `${prodDate} ${timeStr}${qualifier}${factoryInfo.code1 || ''}`;
    
    let line2Middle = `${CONFIG.FACTORY_CODE}${lineCode}`;
    if (qrOption === 'Y') {
        line2Middle += ' ▣ 00001';
    }
    const line2 = `${expiryDate} ${line2Middle} ${factoryInfo.code2 || ''}`.trim();
    
    return {
        line1,
        line2,
        parseData: {
            prodDate,
            prodTime: `${timeStr}${qrOption === 'Y' ? ' ▣合格' : ' 合格'}`,
            factoryCode1: factoryInfo.code1 || '(无)',
            expiryDate,
            factoryLine: line2Middle,
            factoryCode2: factoryInfo.code2 || '(无)'
        }
    };
}

/**
 * 生成BIB喷码
 * @param {Object} params
 * @returns {{line1: string, line2: string, parseData: Object}}
 */
function generateBibCode(params) {
    const { prodDate, expiryDate, factoryInfo, lineSelect, tankCode } = params;
    const seqCode = '00001'; // 固定顺序码
    const bibLineNum = lineSelect === 'BIB1' ? '1' : '2';
    const line1 = `${prodDate} ${seqCode}${factoryInfo.code1 || ''}`;
    const line2 = `${expiryDate} ${CONFIG.FACTORY_CODE}${bibLineNum}${tankCode}${factoryInfo.code2 || ''}`;
    
    return {
        line1,
        line2,
        parseData: {
            prodDate,
            seqCode,
            factoryCode1: factoryInfo.code1 || '(无)',
            expiryDate,
            factoryCode: CONFIG.FACTORY_CODE,
            lineCode: `${bibLineNum} (BIB${bibLineNum}线)`,
            tankCode: `${tankCode}号缸`,
            factoryCode2: factoryInfo.code2 || '(无)'
        }
    };
}

// ==================== DOM 操作与渲染函数 ====================
/**
 * 更新当前时间显示
 */
function updateTimeDisplay() {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).replace(/\//g, '-');
    document.getElementById('currentDateTime').textContent = timeStr;
    return now;
}

/**
 * 同步时间按钮的反馈效果
 */
function syncTimeWithFeedback() {
    const now = updateTimeDisplay();
    const btn = document.getElementById('syncBtn');
    const originalText = btn.textContent;
    const originalBg = btn.style.background;
    
    btn.textContent = '时间已同步';
    btn.style.background = 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)';
    btn.style.transform = 'scale(1.05)';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = originalBg || 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)';
        btn.style.transform = 'scale(1)';
    }, 700);
    return now;
}

/**
 * 设置打印模式，并更新相关UI
 * @param {string} mode - 'normal' | 'short' | 'bib'
 */
function setPrintMode(mode) {
    currentPrintMode = mode;
    
    // 1. 更新按钮激活状态
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // 2. 更新生产线选项
    const lineSelect = document.getElementById('lineSelect');
    const tankContainer = document.getElementById('tankContainer');
    const shelfLifeSelect = document.getElementById('shelfLife');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    
    if (mode === 'bib') {
        // BIB模式
        lineSelect.innerHTML = `
            <option value="">请选择生产线</option>
            <option value="BIB1">BIB1 线</option>
            <option value="BIB2">BIB2 线</option>
        `;
        tankContainer.style.display = 'block';
        qrCodeContainer.style.display = 'none';
        // 更新保质期选项
        shelfLifeSelect.innerHTML = `
            <option value="100">100 天</option>
            <option value="120">120 天</option>
        `;
        shelfLifeSelect.value = '100';
    } else {
        // 常规/缩短模式
        lineSelect.innerHTML = `
            <option value="">请选择生产线</option>
            <option value="A">A 线 → 1</option>
            <option value="B">B 线 → 2</option>
            <option value="C">C 线 → 3</option>
            <option value="D">D 线 → 4</option>
            <option value="E">E 线 → 5</option>
            <option value="F">F 线 → 6</option>
        `;
        tankContainer.style.display = 'none';
        qrCodeContainer.style.display = 'block';
        // 更新保质期选项
        shelfLifeSelect.innerHTML = `
            <option value="270">270 天</option>
            <option value="365">365 天</option>
        `;
        shelfLifeSelect.value = '270';
    }
}

/**
 * 渲染解析表格
 * @param {HTMLElement} container - 表格容器
 * @param {Array} rows - 行数据数组，每项为[label, value]
 */
function renderParseTable(container, rows) {
    container.innerHTML = ''; // 清空现有内容
    rows.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'parse-row';
        row.innerHTML = `
            <div class="cell">${label}</div>
            <div class="cell">${value}</div>
        `;
        container.appendChild(row);
    });
}

/**
 * 显示生成结果
 * @param {string} mode - 当前打印模式
 * @param {Object} results - 包含 inner, outer, bib 结果的对象
 */
function displayResults(mode, results) {
    const resultSection = document.getElementById('resultSection');
    const innerResult = document.getElementById('innerResult');
    const outerResult = document.getElementById('outerResult');
    const bibResult = document.getElementById('bibResult');
    
    // 根据模式显示/隐藏对应结果区域
    if (mode === 'bib') {
        innerResult.style.display = 'none';
        outerResult.style.display = 'none';
        bibResult.style.display = 'block';
        
        // 填充BIB结果
        document.getElementById('bibLine1').textContent = results.bib.line1;
        document.getElementById('bibLine2').textContent = results.bib.line2;
        renderParseTable(document.getElementById('bibParseTable'), [
            ['生产日期', results.bib.parseData.prodDate],
            ['箱顺序码', results.bib.parseData.seqCode],
            ['委托厂首字母', results.bib.parseData.factoryCode1],
            ['到期日期', results.bib.parseData.expiryDate],
            ['工厂代码', results.bib.parseData.factoryCode],
            ['线别', results.bib.parseData.lineCode],
            ['缸号', results.bib.parseData.tankCode],
            ['委托厂尾字母', results.bib.parseData.factoryCode2]
        ]);
    } else {
        // 常规或缩短模式
        innerResult.style.display = 'block';
        outerResult.style.display = 'block';
        bibResult.style.display = 'none';
        
        // 填充瓶盖结果
        document.getElementById('innerLine1').textContent = results.inner.line1;
        document.getElementById('innerLine2').textContent = results.inner.line2;
        renderParseTable(document.getElementById('innerParseTable'), [
            ['生产日期', results.inner.parseData.prodDate],
            ['生产时间', results.inner.parseData.prodTime],
            ['委托厂首字母', results.inner.parseData.factoryCode1],
            ['到期日期', results.inner.parseData.expiryDate],
            ['工厂代码 + 线别', results.inner.parseData.factoryLine],
            ['委托厂尾字母', results.inner.parseData.factoryCode2]
        ]);
        
        // 填充膜包结果
        document.getElementById('outerLine1').textContent = results.outer.line1;
        document.getElementById('outerLine2').textContent = results.outer.line2;
        renderParseTable(document.getElementById('outerParseTable'), [
            ['生产日期', results.outer.parseData.prodDate],
            ['生产时间+合格', results.outer.parseData.prodTime],
            ['委托厂首字母', results.outer.parseData.factoryCode1],
            ['到期日期', results.outer.parseData.expiryDate],
            ['工厂代码 + 线别', results.outer.parseData.factoryLine],
            ['委托厂尾字母', results.outer.parseData.factoryCode2]
        ]);
    }
    
    // 显示结果区域并滚动到可视区域
    resultSection.classList.add('show');
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * 主生成函数
 */
function generateCode() {
    // 1. 收集输入
    const lineSelect = document.getElementById('lineSelect').value;
    const factorySelect = document.getElementById('factorySelect').value;
    const shelfLife = document.getElementById('shelfLife').value;
    const qrOption = document.getElementById('qrCodeOption').value;
    const now = new Date();
    
    // 2. 输入验证
    if (!lineSelect) {
        alert('请选择生产线别！');
        return;
    }
    
    // 3. 准备基础数据
    const prodDate = formatDate(now);
    const factoryInfo = CONFIG.FACTORY_CODE_MAP[factorySelect] || { code1: '', code2: '' };
    const expiryDate = calculateExpiryDate(now, shelfLife);
    
    let results = {};
    
    // 4. 根据模式生成
    if (currentPrintMode === 'bib') {
        // BIB模式验证和生成
        const tankInput = document.getElementById('tankInput').value;
        const tankNum = parseInt(tankInput);
        if (!tankInput || isNaN(tankNum) || tankNum < 1 || tankNum > 25) {
            alert('请输入有效的缸号（1-25）！');
            return;
        }
        const tankCode = String(tankInput).padStart(2, '0');
        
        results.bib = generateBibCode({
            prodDate,
            expiryDate,
            factoryInfo,
            lineSelect,
            tankCode
        });
        
    } else {
        // 常规/缩短模式
        const timeStr = getTimeString(now, currentPrintMode);
        const lineCode = CONFIG.LINE_CODE_MAP[lineSelect];
        
        results.inner = generateInnerCode({
            prodDate,
            timeStr,
            expiryDate,
            factoryInfo,
            lineCode
        });
        
        // 膜包时间固定为24小时制
        const outerTimeStr = getTimeString(now, 'normal');
        results.outer = generateOuterCode({
            prodDate,
            timeStr: outerTimeStr,
            expiryDate,
            factoryInfo,
            lineCode,
            qrOption
        });
    }
    
    // 5. 显示结果
    displayResults(currentPrintMode, results);
}

// ==================== 初始化与事件绑定 ====================
document.addEventListener('DOMContentLoaded', function() {
    // 初始化时间显示
    updateTimeDisplay();
    setInterval(updateTimeDisplay, 1000);
    
    // 初始化打印模式
    setPrintMode(CONFIG.DEFAULT_PRINT_MODE);
    
    // 绑定打印模式按钮事件
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setPrintMode(this.dataset.mode);
        });
    });
    
    // 绑定同步时间按钮事件
    document.getElementById('syncBtn').addEventListener('click', syncTimeWithFeedback);
    
    // 绑定生成按钮事件
    document.getElementById('generateBtn').addEventListener('click', generateCode);
    
    // 为部分表单元素添加交互样式
    ['factorySelect', 'shelfLife', 'qrCodeOption'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', function() {
                this.classList.toggle('has-value', this.value !== '');
            });
        }
    });
    
    // 注册Service Worker (PWA功能)
    if ("serviceWorker" in navigator) {
        window.addEventListener("load", function() {
            navigator.serviceWorker.register("./sw.js")
                .then(reg => console.log("Service Worker 注册成功", reg.scope))
                .catch(err => console.log("Service Worker 注册失败", err));
        });
    }
});