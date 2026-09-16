// 科研工具目录：新增工具时，优先在这里登记分类与入口。
(function () {
    const categories = [
        { id: 'text', name: '文本与语言', icon: '📝', description: '文本清理、转换、统计与排序' },
        { id: 'number', name: '数值与单位', icon: '🔢', description: '数值表示、单位换算与随机数据' },
        { id: 'data', name: '数据与格式', icon: '🗂️', description: '结构化数据的格式化与校验' },
        { id: 'chemistry', name: '化学与燃烧', icon: '🔥', description: '燃烧计量、烟气、排放与燃料性质' },
        { id: 'literature', name: '学术与文献', icon: '📚', description: '论文元数据与参考文献处理' },
        { id: 'engineering', name: '工程与仿真', icon: '🧮', description: '空气动力学与数值仿真辅助计算' }
    ];

    const tools = [
        { id: 'trim', category: 'text', name: '文本去空格', icon: '📝', description: '清理空格、换行和制表符', type: 'inline' },
        { id: 's2t', category: 'text', name: '繁简转换', icon: '🔤', description: '简体与繁体中文相互转换', type: 'inline' },
        { id: 'count', category: 'text', name: '字符计数', icon: '📊', description: '统计字符、单词、数字和行数', type: 'inline' },
        { id: 'line', category: 'text', name: '行号处理', icon: '🔢', description: '批量添加或移除文本行号', type: 'inline' },
        { id: 'sort', category: 'text', name: '文本排序', icon: '↕️', description: '按文本、数字或长度排序', type: 'inline' },
        { id: 'sci', category: 'number', name: '科学计数法', icon: '🔬', description: '普通数字与科学计数法互转', type: 'inline' },
        { id: 'base-convert', category: 'number', name: '进制转换', icon: '🔢', description: '2–36 进制整数快速互转', type: 'inline' },
        { id: 'base-calculator', category: 'number', name: '不同进制计算', icon: '➗', description: '不同进制整数的加减乘除和取余', type: 'inline' },
        { id: 'expression-calculator', category: 'number', name: '科学表达式计算', icon: '🧮', description: '安全计算函数、常量、括号和幂运算', type: 'inline' },
        { id: 'significant-figures', category: 'number', name: '有效数字与修约', icon: '🎯', description: '按有效数字或小数位批量修约', type: 'inline' },
        { id: 'unit', category: 'number', name: '单位换算', icon: '⚖️', description: '常用科研与工程单位换算', type: 'inline' },
        { id: 'random', category: 'number', name: '随机数生成', icon: '🎲', description: '生成可配置的随机数序列', type: 'inline' },
        { id: 'json', category: 'data', name: 'JSON 格式化', icon: '{}', description: '格式化、压缩并校验 JSON', type: 'inline' },
        { id: 'statistics', category: 'data', name: '统计计算器', icon: '📊', description: '均值、分位数、方差和标准差', type: 'inline' },
        { id: 'linear-regression', category: 'data', name: '线性拟合与回归', icon: '📈', description: '最小二乘直线、相关系数和拟合图', type: 'inline' },
        { id: 'error-analysis', category: 'data', name: '误差分析', icon: '📐', description: 'MAE、RMSE、偏差和相对误差', type: 'inline' },
        { id: 'combustion-stoichiometry', category: 'chemistry', name: '燃烧化学计量', icon: '🔥', description: '理论需氧量、空燃比、当量比和烟气', type: 'inline' },
        { id: 'flue-gas-conversion', category: 'chemistry', name: '烟气基准换算', icon: '💨', description: '干湿基与参考氧含量修正', type: 'inline' },
        { id: 'emission-converter', category: 'chemistry', name: '排放单位换算', icon: '🏭', description: 'ppmv、mg/m³、质量流率和比排放', type: 'inline' },
        { id: 'fuel-element-analysis', category: 'chemistry', name: '燃料元素分析', icon: '🧪', description: '分析基准、经验式和理论助燃气量', type: 'inline' },
        { id: 'heating-value', category: 'chemistry', name: '高低位热值', icon: '⚡', description: 'HHV、LHV、含水修正和热输入', type: 'inline' },
        { id: 'doi-citation', category: 'literature', name: 'DOI 引用生成器', icon: '📚', description: '查询 Crossref 并生成常用引用格式', type: 'inline' },
        { id: 'cfd', category: 'engineering', name: 'CFD 参数计算', icon: '🧮', description: '标准大气、y+、边界层和雷诺数计算', type: 'page', target: 'cfd.html' }
    ];

    window.RESEARCH_TOOL_CATALOG = { categories, tools };
}());
