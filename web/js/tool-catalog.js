// 科研工具目录：新增工具时，优先在这里登记分类与入口。
(function () {
    const categories = [
        { id: 'text', name: '文本与语言', icon: '📝', description: '文本清理、转换、统计与排序' },
        { id: 'number', name: '数值与单位', icon: '🔢', description: '数值表示、单位换算与随机数据' },
        { id: 'data', name: '数据与格式', icon: '🗂️', description: '结构化数据的格式化与校验' },
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
        { id: 'unit', category: 'number', name: '单位换算', icon: '⚖️', description: '常用科研与工程单位换算', type: 'inline' },
        { id: 'random', category: 'number', name: '随机数生成', icon: '🎲', description: '生成可配置的随机数序列', type: 'inline' },
        { id: 'json', category: 'data', name: 'JSON 格式化', icon: '{}', description: '格式化、压缩并校验 JSON', type: 'inline' },
        { id: 'doi-citation', category: 'literature', name: 'DOI 引用生成器', icon: '📚', description: '查询 Crossref 并生成常用引用格式', type: 'inline' },
        { id: 'cfd', category: 'engineering', name: 'CFD 参数计算', icon: '🧮', description: '标准大气、y+、边界层和雷诺数计算', type: 'page', target: 'cfd.html' }
    ];

    window.RESEARCH_TOOL_CATALOG = { categories, tools };
}());
