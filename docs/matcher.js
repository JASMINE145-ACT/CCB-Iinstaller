/**
 * 价格库智能匹配引擎
 * 【v36.91】新增：D低价格档位(level_d_low)；RUCIKA/CEILING品牌双向隔离；cm修复（cm=长度非管径）；三角阀≠角阀；软管=无货
 * 【v36.90】新增：给水/排水系列隔离 — 查询"给水"排除D排水系列，查询"排水"排除AW给水系列；补芯=异径套
 * 【v36.89c】新增：管材/水龙头双向隔离规则 — "Pipa PVC AW"（管材）不再匹配到水龙头
 * 【v36.89】修复：Rule 3 角度过滤 — 查询90°时产品无90°标识（如管材/盘管）现在正确排除；新增外牙=外螺纹别名
 * 【v36.88】新增：支持 INCHI 英寸格式（1/2 INCHI、3/4 INCHI、1 INCHI 等）；斜口三通=45°三通（等径）；修复异径斜口三通识别
 * 【v36.87】修复：extractReducerSize排除角度数字(45/90)被误识别为异径；extractSize步骤5扩展fittingKeywords(顺水三通/管堵/管/接古等)；别名添加管堵/接古。v36.86：角度排除+管箍/接箍
 * 【v36.80】新增：支持 "ke" 分隔符异径英寸格式（½"ke¾"、¾"ke1"）；v36.79：变径直接→异径套中文别名；英文缩写智能识别
 */

// 产品数据（将在加载时填充）
let productsData = [];
let searchResults = [];

// 【v36.14新增】正则表达式缓存 - 避免重复编译
const REGEX_CACHE = {
    // 尺寸提取
    dnMatch: /(?:dn|de)\s*(\d+)/i,
    phiMatch: /[\u03a6\u03c6\u00d8\u2205]\s*(\d+)/, // 【v36.18d】扩展支持 ∅ U+2205
    inchMatch: /(\d+(?:-\d+)?\/\d+)"/, // 【v36.18修复】支持 1/2" 和 1-1/2" 两种格式
    mmMatch: /(\d{2,3})\s*mm\b/i,
    cmMatch: /(\d{1,3})\s*(cm|厘米)\b/i,
    reducerSize: /(\d+)\s*[\*x×]\s*(\d+)/,
    
    // 管件类型
    teePattern: /三通|tee|\bET\b|\bRT\b|\bLT\b|\bYT\b/i,
    elbowPattern: /弯头|elbow|\bFTE\b|\bMTE\b/i,
    reducerPattern: /异径套|大小头|异径接头|异径管|变径|reducing\s*(socket|coupler|adaptor)|reducer|\bRS\b|\bRD\b/i,
    couplingPattern: /直通|直接|coupling|socket|管箍|接箍|接古|\bCP\b/i,
    
    // 材料
    pvcPattern: /upvc|pvc/i,
    pprPattern: /ppr|pp-r/i,
    pePattern: /pe|hdpe|pex/i,
    
    // 用途
    conduitPattern: /线槽|走线槽|线管|电线|电工|conduit|electrical|八角盒|底盒|线盒|接线盒|开关盒|插座盒|暗盒|明盒|灯头盒|分线盒/i,
    waterPattern: /给水|water|aw/i,
    drainPattern: /排水|drain|dwv/i,
    // 【v36.78新增】胶水识别 - 支持中英文胶水关键词
    gluePattern: /胶水|胶|glue|cement|粘合|粘剂/i,
    
    // 其他
    pprContextPattern: /ppr/i,
    drainContextPattern: /排水|drain|dwv|pvc-u.*d/i,
    jisContextPattern: /pvc-u|upvc|日标|jis|排水/i,
};

// 【v36.6新增】产品黑名单 - 这些编码的产品永远不会出现在匹配结果中
const PRODUCT_BLACKLIST = new Set([
    '8030051700',  // PVC电线管(C管)白色 5/8 4M/根 联塑
    '8030052245',  // PVC电线管(C管)白色5/8 2.9M/根 联塑
]);

// 【v36.7新增】线管模式白名单 - 勾选"线管"复选框时只匹配这些编码
const CONDUIT_WHITELIST = new Set([
    '8030050055', '8030050068', '8030050080', '8030050090', '8030050101',
    '8030051700', '8030052245', '8030051550', '8030020288', '8030020289',
    '8030020290', '8030020291', '8030020170', '8030020171', '8030020172',
    '8030020173', '8030020174', '8030020175', '8030021230', '8030021231',
    '8030021212', '8030021213', '8030020206', '8030020207', '8030020208',
    '8030020209', '8030020210', '8030020621', '8030020202', '8030020203',
    '8030020204', '8030020205', '8030040024', '8030020221', '8030020222',
    '8030020223', '8030020224', '8030020225', '8030020185', '8030020186',
    '8030020187', '8030020580', '8030020231', '8030020232', '8030020233',
    '8030020239', '8030020240', '8030020241', '8030020257', '8030020258',
    '8030020191', '8030020192', '8030020193', '8030020247', '8030020248',
    '8030020249', '8030020112', '8030020113', '8030020114', '8030020378',
    '8030020368', '8030020167', '8030020168', '8030020169', '8030020382',
    '8030020383', '8030020116', '8030020117', '8030020379', '8030020268',
    '8030020380', '8030020118', '8030020119', '8030020120', '8030020121',
    '8030020122', '8030020123', '8030020140', '8030020141', '8030020142',
    '8030020143', '8030020144', '8030020155', '8030020401', '8030020402',
    '8030020044', '8030020045', '8030020046', '8030020047', '8030020062',
    '8030020063', '8030020064', '8030020065', '8030020052', '8030020053',
    '8030020054', '8030020055', '8030020066', '8030021130', '8030020917',
    '8030020864', '8030020865', '8030020071', '8030021168', '8030020070',
    '8030020072', '8030020068', '8030020069', '8030020056', '8030020057',
    '8030020058', '8030020562', '8030020059', '8030020060', '8030020918',
    '8030020618', '8030020619', '8030020617', '8030020620', '8030020663',
    '8030020664', '8030021235', '8030021236', '8030020851', '8030020661',
    '8030020764', '8030020041', '8030020042', '8030020387', '8030020920',
    '8030020369', '8030020386', '8030021196', '8030020255', '8030021234',
    '8030020126', '8030020127', '8030020128', '8030020129', '8030020130',
    '8030021111', '8030021112', '8030020594', '8030020595', '8030020596',
    '8030020737', '8030020158', '8030020159', '8030020160', '8030020808',
    '8030020812', '8030020754', '8030021225', '8030020351', '8030020352',
    '8030020353', '8030020790', '8030020935', '8030020936', '8030020361',
    '8030020364', '8030020376', '8030020076', '8030020077', '8030020389',
    '8030020078'
]);

// 【v36.78新增】胶水产品白名单 - 查询胶水时只匹配这些编码
// 原因：胶水产品的keywords中有错误的"dn400"/"dn100"（实为重量g），会干扰尺寸匹配
const GLUE_WHITELIST = new Set([
    'GPR-LL02L00004',  // PVC胶水(绿罐) 400g - ISARPLAS
    'GPR-LL02L21002',  // PVC胶水(绿罐) 400g - ASOKA
    '80516585',        // 印尼管道胶水 400g - RUCIKA
    '80516584',        // 印尼PVC再粘合胶水 100g - RUCIKA
]);

// 【v36.31新增】PPR法兰套装配套关系映射
// 当勾选"法兰"复选框时，查询法兰套会自动展示配套产品
// 结构：法兰套编码 → { 橡胶垫圈编码, 螺栓规格, 螺栓数量 }
const FLANGE_SET_MAPPING = {
    // dn40 (1-1/4")
    '8010071331': { gasket: '8010070749', boltCode: '6900010080150', boltCount: 4, size: 'dn40' },
    // dn50 (1-1/2")
    '8010071332': { gasket: '8010070750', boltCode: '6900010080150', boltCount: 4, size: 'dn50' },
    // dn63 (2")
    '8010071333': { gasket: '8010070751', boltCode: '6900010080150', boltCount: 4, size: 'dn63' },
    // dn75 (2-1/2")
    '8010071341': { gasket: '8010070752', boltCode: '6900010080151', boltCount: 8, size: 'dn75' },
    // dn90 (3")
    '8010071334': { gasket: '8010070753', boltCode: '6900010080151', boltCount: 8, size: 'dn90' },
    // dn110 (4")
    '8010071335': { gasket: '8010070747', boltCode: '6900010080151', boltCount: 8, size: 'dn110' },
    // dn160 (6")
    '8010071336': { gasket: '8010070748', boltCode: '6900010080151', boltCount: 8, size: 'dn160' },
};

// 规格映射（英寸规格）— 基于 DN|英寸|公称外径 标准对照表
// 【v36.78c修复】使用 \u0022 代替直接引号，避免编码问题
const SIZE_MAPPINGS = {
    '1/2\u0022': ['dn15', '20'],
    '3/4\u0022': ['dn20', '25'],
    '1\u0022': ['dn25', '32'],
    '1-1/4\u0022': ['dn32', '40'],
    '1-1/2\u0022': ['dn40', '50'],
    '2\u0022': ['dn50', '63'],
    '2-1/2\u0022': ['dn65', '75'],
    '3\u0022': ['dn80', '90'],
    '4\u0022': ['dn100', '110'],
    '5\u0022': ['dn125', '140'],
    '6\u0022': ['dn150', '160'],
    '8\u0022': ['dn200', '219'],
    '10\u0022': ['dn250', '273'],
    '12\u0022': ['dn300', '325'],
};

// 俗称 → 英寸 映射表（4分、6分、1寸、1寸半 等）
// 【v36.78c修复】使用 \u0022 代替直接引号，避免编码问题
const ALIAS_TO_INCH = {
    '4分': '1/2\u0022',
    '6分': '3/4\u0022',
    '1寸': '1\u0022',
    '1寸2': '1-1/4\u0022',
    '1寸二': '1-1/4\u0022',
    '1寸半': '1-1/2\u0022',
    '2寸': '2\u0022',
    '2寸半': '2-1/2\u0022',
    '3寸': '3\u0022',
    '4寸': '4\u0022',
    '5寸': '5\u0022',
    '6寸': '6\u0022',
    '8寸': '8\u0022',
    '10寸': '10\u0022',
    '12寸': '12\u0022',
    '一分': '1/2\u0022',     // 变体写法
    '两分': '3/4\u0022',
    '三分': '1\u0022',
    '四分': '1-1/4\u0022',
    '六分': '2\u0022',
    // 【v36.12学习LEKE报价单】Unicode特殊字符英寸
    '½': '1/2\u0022',        // U+00BD
    '¼': '1/4\u0022',        // U+00BC
    '¾': '3/4\u0022',        // U+00BE
};

// 【v35.1新增】英寸规格 → PPR专用DN映射表
// PPR产品的DN编号用的是管材外径(mm)，不是标准公称直径！
// 例：1/2" = φ20mm → PPR产品标为 dn20（不是标准 dn15）
// 【v36.78c修复】使用 \u0022 代替直接引号，避免编码问题
const INCH_TO_PPR_DN = {
    '1/2\u0022':   'dn20',
    '3/4\u0022':   'dn25',
    '1\u0022':     'dn32',
    '1-1/4\u0022': 'dn40',
    '1-1/2\u0022': 'dn50',
    '2\u0022':     'dn63',
    '2-1/2\u0022': 'dn75',
    '3\u0022':     'dn90',
    '4\u0022':     'dn110',
};

// 【v36.28新增】标准公称直径(DN) → PPR外径编号 对照表
// PPR产品库使用外径(mm)作为DN编号，而客户输入的是标准公称直径
// 例：客户说 "DN15" → PPR产品库里标注 "dn20"（外径20mm）
const STANDARD_DN_TO_PPR_DN = {
    '15':  'dn20',   // 1/2"  外径20mm
    '20':  'dn25',   // 3/4"  外径25mm
    '25':  'dn32',   // 1"    外径32mm
    '32':  'dn40',   // 1-1/4" 外径40mm
    '40':  'dn50',   // 1-1/2" 外径50mm
    '50':  'dn63',   // 2"    外径63mm
    '65':  'dn75',   // 2-1/2" 外径75mm
    '80':  'dn90',   // 3"    外径90mm
    '100': 'dn110',  // 4"    外径110mm
};

// 【v35.3新增】PN公称压力 → MPa 对照表 + 产品名称匹配模式
// PN12.5 = 12.5 bar = 1.25 MPa
const PN_MAPPING = {
    // PN值 → { mpa: 对应MPa, patterns: 产品名中可能出现的格式 }
    'pn10':   { mpa: '1.0',  patterns: ['PN10', 'pn10', 'S5(1.0', 'S5(1.0M', '(1.0MPa)', '(1.0Mpa)'] },
    'pn12.5': { mpa: '1.25', patterns: ['PN12.5', 'pn12.5', 'S4(1.25', 'S4(1.2', '(1.25MPa)', '(1.25Mpa)'] },
    'pn16':   { mpa: '1.6',  patterns: ['PN16', 'pn16', 'S3.2(1.6', 'S3.2(1.', '(1.6MPa)', '(1.6Mpa)'] },
    'pn20':   { mpa: '2.0',  patterns: ['PN20', 'pn20', 'S2.5(2.0', 'S2.5(2.', '(2.0MPa)', '(2.0Mpa)'] },
    'pn25':   { mpa: '2.5',  patterns: ['PN25', 'pn25', 'S2(2.5', '(2.5MPa)', '(2.5Mpa)'] },
};

// 【v35.3新增】MPa → PN 反向映射（用于查询端解析）
const MPA_TO_PN = {
    '1.0':  'pn10',
    '1.25': 'pn12.5',
    '1.6':  'pn16',
    '2.0':  'pn20',
    '2.5':  'pn25',
};

// 管材外径(mm) → 公称直径(DN) 映射表
// 基于 DN|英寸|公称外径 标准对照表（精确值）
const MM_TO_DN_MAPPING = {
    // === 标准外径 → DN（来自官方对照表）===
    '20': 'dn15',   // 4分
    '25': 'dn20',   // 6分
    '32': 'dn25',   // 1寸
    '40': 'dn32',   // 1寸2
    '50': 'dn40',   // 1寸半
    '63': 'dn50',   // 2寸
    '75': 'dn65',   // 2寸半
    '90': 'dn80',   // 3寸
    '110': 'dn100', // 4寸
    '140': 'dn125', // 5寸
    '160': 'dn150', // 6寸
    '219': 'dn200', // 8寸
    '273': 'dn250', // 10寸
    '325': 'dn300', // 12寸

    // === PPR 管常用外径系列（与标准略有差异）===
    '16': 'dn15',   // PPR 小口径
    '21': 'dn20',
    '26': 'dn25',
    '34': 'dn32',
    '42': 'dn40',
    '48': 'dn40',
    '60': 'dn50',

    // === 常见近似值（容错）===
    '22': 'dn15',   // 接近20
    '35': 'dn32',   // 接近32/40之间
};

// 反向映射：DN值对应的外径范围（用于兼容性检查）
const DN_TO_MM_RANGE = {
    'dn15': { min: 16, max: 25 },
    'dn20': { min: 20, max: 32 },
    'dn25': { min: 25, max: 40 },
    'dn32': { min: 30, max: 48 },
    'dn40': { min: 38, max: 55 },
    'dn50': { min: 48, max: 70 },
    'dn65': { min: 65, max: 85 },
    'dn75': { min: 65, max: 85 },  // 2寸半
    'dn80': { min: 80, max: 100 },
    'dn90': { min: 85, max: 110 },
    'dn100': { min: 95, max: 125 },
    'dn110': { min: 105, max: 145 },
    'dn125': { min: 120, max: 160 },
    'dn140': { min: 130, max: 170 },
    'dn150': { min: 145, max: 180 },
    'dn160': { min: 155, max: 195 },
    'dn200': { min: 190, max: 240 },
    'dn219': { min: 210, max: 240 },
    'dn250': { min: 240, max: 290 },
    'dn273': { min: 260, max: 295 },
    'dn300': { min: 290, max: 340 },
    'dn325': { min: 310, max: 350 },
};

// 【v36.14新增】预计算产品特征 - 在加载时一次性提取，避免搜索时重复计算
function precomputeProductFeatures(products) {
    const startTime = performance.now();
    
    const computed = products.map(p => {
        const nameCn = (p.name_cn || '').toLowerCase();
        const nameEn = (p.name_en || '').toLowerCase();
        const combinedName = nameCn + ' ' + nameEn;
        const normalizedName = normalizeText(combinedName);
        
        // 预计算产品主尺寸
        const sizeInfo = extractProductPrimarySize(combinedName);
        
        // 预计算材料类型
        let material = null;
        if (REGEX_CACHE.pvcPattern.test(combinedName)) material = 'pvc';
        else if (p.sheet === 'RUCIKA') material = 'pvc';  // 【v36.92】RUCIKA STANDARD AW = PVC-U 给水管
        else if (REGEX_CACHE.pprPattern.test(combinedName)) material = 'ppr';
        else if (REGEX_CACHE.pePattern.test(combinedName)) material = 'pe';
        
        // 预计算管件类型
        const fittingType = extractFittingTypeForCache(combinedName);
        
        // 预计算产品分类标记
        const isConduit = REGEX_CACHE.conduitPattern.test(combinedName);
        const isWaterPipe = REGEX_CACHE.waterPattern.test(combinedName) || REGEX_CACHE.drainPattern.test(combinedName);
        const isTee = REGEX_CACHE.teePattern.test(combinedName);
        const isElbow = REGEX_CACHE.elbowPattern.test(combinedName);
        const isReducer = REGEX_CACHE.reducerPattern.test(combinedName);
        const isCoupling = REGEX_CACHE.couplingPattern.test(combinedName);
        const isThreadedElbow = /内螺纹弯头|外螺纹弯头|Female Thread Elbow|Male Thread Elbow/i.test(combinedName);
        
        return {
            ...p,
            _cache: {
                nameCn,
                nameEn,
                combinedName,
                normalizedName,
                sizeInfo,
                material,
                fittingType,
                isConduit,
                isWaterPipe,
                isTee,
                isElbow,
                isReducer,
                isCoupling,
                isThreadedElbow,
                hasSize: !!sizeInfo
            }
        };
    });
    
    const endTime = performance.now();
    console.log(`[v36.14] 预计算 ${products.length} 个产品特征，耗时 ${(endTime - startTime).toFixed(2)}ms`);
    return computed;
}

// 【v36.14新增】为缓存优化的管件类型提取（简化版，避免重复逻辑）
function extractFittingTypeForCache(text) {
    if (!text) return null;
    text = text.toLowerCase();
    
    // 快速检测常见类型
    if (/内螺纹弯头|female thread elbow|\bFTE\b/i.test(text)) return '内螺纹弯头';
    if (/外螺纹弯头|male thread elbow|\bMTE\b/i.test(text)) return '外螺纹弯头';
    if (/顺水三通|short tee|large radius|\bLT\b/i.test(text)) return '顺水三通';
    if (/等径三通|正三通|\bET\b/i.test(text)) return '90°等径三通';
    if (/斜三通|斜口三通|y branch|\bYT\b/i.test(text)) return '45°斜三通';
    if (/异径三通|reduc.*tee|\bRT\b/i.test(text)) return '90°异径三通';
    if (/胶水|粘合剂|pipe cement|pvc胶/.test(text)) return '胶水';
    if (/弯管弹簧|弯管器|弹簧/.test(text)) return '弯管弹簧';
    if (/管接头|锁母|杯梳|螺节/.test(text)) return '管接头';
    if (/接线盒|八角盒|线盒|开关盒/.test(text)) return '接线盒';
    // 【v36.61修正】补全别名检测（与 aliasMap 同步）
    // 【v36.79新增】加入变径直接、变径接头、英文RS/RD缩写
    if (/大小头|异径套|变径|异径直接|变径直通|变径直接|变径接头|补芯|同心异径接头|reducing\s*socket|\bRS\b|\bRD\b/i.test(text)) return '异径套';
    if (/管帽|堵头|管堵|end\s*cap|pipe\s*cap/i.test(text)) return '管帽';
    if (/直通|直接|coupling|管箍|接箍|接古|\bCP\b/i.test(text)) return '直通';
    if (/三通|tee|\bET\b|\bRT\b/i.test(text)) return '三通';
    if (/弯头|elbow/i.test(text)) return '弯头';
    
    return null;
}

// 加载产品数据
async function loadProducts() {
    try {
        const response = await fetch('products.json');
        const allProducts = await response.json();
        console.log(`Loaded ${allProducts.length} products`);
        
        // 【v36.14】预计算产品特征，加速后续匹配
        return precomputeProductFeatures(allProducts);
    } catch (error) {
        console.error('Failed to load products:', error);
        // 尝试从本地存储加载
        const cached = localStorage.getItem('productsData');
        if (cached) {
            // 【v36.26修复】本地缓存数据也需要预计算特征
            const products = JSON.parse(cached);
            return precomputeProductFeatures(products);
        }
        return [];
    }
}

// 根据选择过滤产品数据
// 【v36.66b修正】新增 keywords 参数，当关键词含电工类词汇时，不排除白名单产品
function filterProductsBySource(allProducts, gbOnly, keywords = []) {
    // 【v36.6】先过滤掉黑名单产品
    let filtered = allProducts.filter(p => !PRODUCT_BLACKLIST.has(p.material_code));
    
    // 【v36.7】线管模式：只使用白名单中的产品
    // 【v36.25修正】未勾选线管时，排除白名单产品（双向隔离）
    // 【v36.66b修正】但如果关键词含电工类词汇（弹簧、接线盒等），不排除白名单产品
    const conduitMode = document.getElementById('conduitMode')?.checked;
    
    // 检测关键词是否含电工类词汇
    const electricalKeywords = [
        '线管', '电线管', '电工管', 'conduit', 'electrical',
        '八角盒', '底盒', '线盒', '接线盒', '开关盒', '插座盒',
        '暗盒', '明盒', '灯头盒', '分线盒', '过路盒', '中间盒',
        '弯管弹簧', '弹簧', '穿线管'
    ];
    const hasElectricalKeyword = keywords.some(kw => 
        electricalKeywords.some(ek => kw.toLowerCase().includes(ek.toLowerCase()))
    );
    
    // 【v36.78新增】检测关键词是否含胶水类词汇
    const glueKeywords = ['胶水', '胶', 'glue', 'cement', '粘合', '粘剂'];
    const hasGlueKeyword = keywords.some(kw => 
        glueKeywords.some(gk => kw.toLowerCase().includes(gk.toLowerCase()))
    );
    
    if (conduitMode) {
        // 勾选线管：只匹配白名单中的线管产品
        filtered = filtered.filter(p => CONDUIT_WHITELIST.has(p.material_code));
        return filtered; // 线管模式直接返回，不再应用其他过滤
    } else if (hasGlueKeyword) {
        // 【v36.78新增】胶水查询：只匹配白名单中的胶水产品
        // 原因：胶水产品的keywords中有错误的"dn400"/"dn100"（实为重量g），会干扰尺寸匹配
        // 排除管件产品（弯头、三通、直通等），防止"pvc胶水"匹配到弯头
        const fittingPatterns = [/弯头/i, /三通/i, /直通/i, /套筒/i, /管件/i, /elbow/i, /tee/i, /coupling/i];
        filtered = filtered.filter(p => {
            // 优先匹配胶水白名单
            if (GLUE_WHITELIST.has(p.material_code)) return true;
            // 排除管件产品
            const name = (p.name_cn || '') + ' ' + (p.name_en || '');
            return !fittingPatterns.some(pat => pat.test(name));
        });
        console.log('[v36.78] 检测到胶水关键词，执行胶水专用过滤');
    } else if (hasElectricalKeyword) {
        // 【v36.66b】关键词含电工类词汇：保留白名单产品（不排除）
        console.log('[v36.66b] 检测到电工类关键词，保留线管白名单产品');
    } else {
        // 未勾选线管且非电工类关键词：排除白名单中的线管产品，防止水管查询匹配到线管
        filtered = filtered.filter(p => !CONDUIT_WHITELIST.has(p.material_code));
    }
    
    // 【v36.93新增】PE复选框：控制PE管材sheet的独立数据源
    const peMode = document.getElementById('filterPE')?.checked;
    if (peMode) {
        // 勾选PE：只匹配PE管材sheet（HDPE盘管/直管，含真实价格）
        return filtered.filter(p => p.sheet === 'PE管材');
    }
    
    if (!gbOnly) {
        // 不勾选国标：排除国标管件、PE管材，但保留排水配件（PVC-U排水系列始终可用）
        // 【v36.91修正】国标管件sheet同时包含国标给水管件和PVC-U排水配件，
        // "国标"复选框仅控制给水管件，排水配件不应受其影响
        // 【v36.93新增】PE管材为独立数据源，不勾选PE时不参与匹配
        return filtered.filter(p => 
            p.sheet !== '国标管件' || 
            /排水配件|pvc-u.*排水|排水系列/i.test((p.name_cn || '') + ' ' + (p.name_en || ''))
        ).filter(p => p.sheet !== 'PE管材');
    } else {
        // 勾选国标：只读取国标管件（含给水管件和排水配件）
        return filtered.filter(p => p.sheet === '国标管件');
    }
}

// 应用临时过滤规则
function applyTempFilters(products) {
    // 【v36.93】PE复选框已在 filterProductsBySource 中通过 sheet 级别隔离处理，
    // 此处不再对 PE 做材料正则过滤，避免 PE + PVC 同时勾选时冲突归零
    const peMode = document.getElementById('filterPE')?.checked;
    
    // 获取材料类型限制（PE除外，已由sheet级别控制）
    const allowedMaterials = [];
    if (document.getElementById('filterPVC')?.checked) allowedMaterials.push('pvc');
    if (document.getElementById('filterPPR')?.checked) allowedMaterials.push('ppr');
    
    // 获取排除关键词
    const excludeInput = document.getElementById('excludeKeywords')?.value || '';
    const excludeKeywords = excludeInput.split(/[,，]/).map(k => k.trim().toLowerCase()).filter(k => k);
    
    // 【v36.36修复】材料关键词必须用单词边界匹配，避免"pe"匹配到"pipe"/"upvc"等
    // 【v36.38修复】HDPE中的PE不在单词边界，需要单独匹配
    const materialPatterns = {
        'pvc': /\bpvc\b|pvc-u|upvc/i,
        'ppr': /\bppr\b|pp-r\b|pp_r\b/i,
    };
    
    return products.filter(p => {
        const nameCn = (p.name_cn || '').toLowerCase();
        const nameEn = (p.name_en || '').toLowerCase();
        const combinedName = nameCn + ' ' + nameEn;
        
        // 材料类型过滤（PE模式时跳过，由sheet级别控制）
        if (!peMode && allowedMaterials.length > 0) {
            const hasAllowedMaterial = allowedMaterials.some(material => {
                const pattern = materialPatterns[material];
                if (pattern) {
                    return pattern.test(combinedName);
                }
                return combinedName.includes(material);
            });
            if (!hasAllowedMaterial) {
                return false;
            }
        }
        
        // 排除关键词过滤
        if (excludeKeywords.length > 0) {
            const hasExcludedKeyword = excludeKeywords.some(keyword => 
                combinedName.includes(keyword)
            );
            if (hasExcludedKeyword) {
                return false;
            }
        }
        
        return true;
    });
}

// 提取规格数字（查询端 — 必须与产品端 extractProductPrimarySize 对齐）
function extractSize(text) {
    if (!text) return null;
    text = text.toLowerCase();
    // 【v36.77新增】引号归一化：将各种弯引号/特殊引号统一替换为直引号 "
    // 涵盖：U+201C 左双引号"、U+201D 右双引号"、U+2033 双撇″、U+301E 〞
    // 用户从Excel/文档复制规格时常带入这类字符，导致英寸识别失败
    text = text.replace(/[\u201c\u201d\u2033\u301e]/g, '"');
    
    // 1. 匹配 DN/dn/De/de + 数字
    // 【v36.52修正】De（外径）需要根据 MM_TO_DN_MAPPING 转换为对应 DN
    const dnMatch = text.match(/(dn|de)\s*(\d+)/i);
    if (dnMatch) {
        const prefix = dnMatch[1].toLowerCase();
        let dnVal = dnMatch[2];
        
        // 【v36.52新增】De（外径）→ DN 转换
        // 例：De160（外径160mm）→ dn150，De50（外径50mm）→ dn40
        // 【v36.74修复】PPR上下文：de=dn（数字=外径mm=PPR产品编号），不做MM_TO_DN转换
        if (prefix === 'de') {
            // PPR场景：产品编号就是外径(mm)，de25→dn25（数字相等）
            const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
            if (isPprCtx) {
                return `dn${dnVal}`;  // PPR管 de25 → dn25
            }
            // 非PPR场景（PVC/PE等）：外径→DN转换
            const mappedDn = MM_TO_DN_MAPPING[dnVal];
            if (mappedDn) {
                return mappedDn;  // 外径50mm → dn40
            }
            // 如果映射表中没有，直接返回 dn+原值（兜底）
            return `dn${dnVal}`;
        }
        
        // 【v36.24修正】日标 PVC-U 排水管中 DN32 对应 DN25（1"）
        // 注意：不是 DN35（1-1/4"）
        const isJisContext = /pvc-u|upvc|日标|jis|排水|冷凝水/i.test(text);
        if (isJisContext && dnVal === '32') {
            return 'dn25'; // 日标 DN32 实际对应 DN25（1"）
        }
        
        // 【v36.28新增】PPR上下文：标准公称直径 → PPR外径编号
        // PPR产品库使用外径(mm)命名，客户输入标准DN时需转换
        // 例：客户输入"PP-R热水管 DN15" → extractSize应返回dn20（外径20mm）
        // 【v36.33新增】截止阀也是PPR配件，需要触发PPR DN转换
        // 【v36.70新增】跳过条件：如果 DN 数字本身就是 PPR 外径系列值（20/25/32/40/50/63/75/90/110），
        //   说明用户直接用了外径编号，不需要再转换，直接返回 dn+原值
        //   例：查询"PPR管DN32" → DN32已经是外径值 → 直接返回dn32，不再转成dn40
        const PPR_OD_SET = new Set(['20','25','32','40','50','63','75','90','110']);
        const isPprCtx = /ppr|pp-r|pp_r|截止阀/i.test(text);
        if (isPprCtx && STANDARD_DN_TO_PPR_DN[dnVal]) {
            // 如果该 DN 数字本身就是 PPR 外径系列，跳过转换（直接用原值）
            if (PPR_OD_SET.has(dnVal)) {
                return `dn${dnVal}`;
            }
            return STANDARD_DN_TO_PPR_DN[dnVal];
        }
        
        return `dn${dnVal}`;
    }
    
    // 2a. 【v36.69新增】匹配 ⌀ 符号（U+2300，DIAMETER SIGN）
    // ⌀ 代表真正的外径尺寸（外径mm），必须通过 MM_TO_DN_MAPPING 转换为 DN
    // 例：⌀110 → 外径110mm → DN100；⌀50 → 外径50mm → DN40；⌀75 → DN65
    const diameterSignMatch = text.match(/\u2300\s*(\d+)/);
    if (diameterSignMatch) {
        const mmVal = diameterSignMatch[1];
        const mappedDn = MM_TO_DN_MAPPING[mmVal];
        if (mappedDn) {
            return mappedDn; // 外径mm → DN（如 ⌀110 → dn100）
        }
        // 没有精确映射时直接用 dn + 值（兜底）
        return `dn${mmVal}`;
    }
    
    // 【v36.78新增】PVC电线管专用尺寸映射：φ15 → dn16
    // 联塑PVC电线管的标注为 dn16，实际外径约16mm，用户可能输入"φ15"来指代
    const CONDUIT_PHI_MAPPING = {
        '15': 'dn16',  // φ15 → dn16（联塑PVC电线管最小规格）
    };
    
    // 2b. 匹配 Φ/φ/Ø/∅ + 数字（电工套管常用，Ø 也是常见直径符号）
    // 【v36.18d】扩展支持的字符：ΦφØ∅（包括空集符号 ∅ U+2205）
    // 【v36.64修正】Φ 后面的数字全部直接等于 dn，不做外径→DN转换
    // 原因：含 Φ 标注的产品（PPR/PVC等）其 DN 号码本来就是外径 mm
    // 例：Φ40 → dn40，Φ50 → dn50（不再转换为 dn32、dn40）
    // 【v36.78新增】线管上下文：φ15 → dn16（特殊映射）
    const phiMatch = text.match(/[\u03a6\u03c6\u00d8\u2205]\s*(\d+)/);
    if (phiMatch) {
        const mmVal = phiMatch[1];
        const isConduitCtx = /线槽|走线槽|线管|电线管|电工|conduit/i.test(text);
        // 线管上下文：φ15 → dn16 特殊映射
        if (isConduitCtx && CONDUIT_PHI_MAPPING[mmVal]) {
            return CONDUIT_PHI_MAPPING[mmVal];
        }
        return `dn${mmVal}`;  // 直接返回，不做外径→DN转换
    }
    
    // 3.【v33.1新增】匹配俗称（4分、6分、1寸、1寸半、2寸等）
    // 这是管道行业最常用的叫法，必须优先识别！
    // 【v35.1修复】PPR产品DN编号用外径(mm)，不是标准公称直径
    // 例：1/2" → 标准dn15，但PPR产品标为 dn20（φ20mm）
    const isPprContext = /ppr/i.test(text);
    
    for (const [alias, inch] of Object.entries(ALIAS_TO_INCH)) {
        if (text.includes(alias)) {
            // PPR上下文：使用外径作为DN编号
            if (isPprContext && INCH_TO_PPR_DN[inch]) {
                return INCH_TO_PPR_DN[inch];
            }
            // 默认：使用标准公称直径
            const mapped = SIZE_MAPPINGS[inch];
            if (mapped) return mapped[0];
        }
    }
    
    // 4. 匹配英寸规格（带引号的格式如 1/2"、3/4"、1-1/2"、1"、2"）
    // 【v36.18修复】修正正则，支持 1/2" 和 1-1/2" 两种格式
    // 【v36.83修复】扩展支持整数英寸（1"、2"、3"、4" 等）
    const inchMatch = text.match(/(\d+(?:-\d+)?\/\d+|\d+)\"/);
    if (inchMatch) {
        const inch = inchMatch[1] + '"';

        // PPR上下文：使用外径作为DN编号
        if (isPprContext && INCH_TO_PPR_DN[inch]) {
            return INCH_TO_PPR_DN[inch];
        }
        // 默认：使用标准公称直径
        const mapped = SIZE_MAPPINGS[inch];
        if (mapped) {
            return mapped[0];
        }
    }
    
    // 【v36.88新增】匹配 INCHI 格式（如 1/2 INCHI、3/4 INCHI、1 INCHI、1-1/2 INCHI）
    // INCHI = 英寸的写法，出现在用户输入中
    const inchMatch2 = text.match(/(\d+(?:-\d+)?\/\d+|\d+)\s*INCHI/i);
    if (inchMatch2) {
        const inch = inchMatch2[1] + '"';
        
        // PPR上下文：使用外径作为DN编号
        if (isPprContext && INCH_TO_PPR_DN[inch]) {
            return INCH_TO_PPR_DN[inch];
        }
        // 默认：使用标准公称直径
        const mapped = SIZE_MAPPINGS[inch];
        if (mapped) {
            return mapped[0];
        }
    }
    
    // 【v36.34新增，v36.78修复】匹配 "数字英寸/寸" 中文格式（如 3/4英寸、1/2寸、1-1/2寸）
    // 用户可能输入「3/4英寸」或「1/2寸」，两种写法都要支持
    const chineseInchMatch = text.match(/(\d+(?:-\d+)?\/\d+)\s*[英]?寸/);
    if (chineseInchMatch) {
        const inch = chineseInchMatch[1] + '"';
        
        // PPR上下文：使用外径作为DN编号
        if (isPprContext && INCH_TO_PPR_DN[inch]) {
            return INCH_TO_PPR_DN[inch];
        }
        // 默认：使用标准公称直径
        const mapped = SIZE_MAPPINGS[inch];
        if (mapped) {
            return mapped[0];
        }
    }
    
    // 【v36.34新增，v36.78修复】匹配 "X英寸/寸" 整数英寸格式（如 1英寸、2寸、3英寸）
    const integerInchMatch = text.match(/(\d+)\s*[英]?寸/);
    if (integerInchMatch) {
        const inch = integerInchMatch[1] + '"';
        
        // PPR上下文：使用外径作为DN编号
        if (isPprContext && INCH_TO_PPR_DN[inch]) {
            return INCH_TO_PPR_DN[inch];
        }
        // 默认：使用标准公称直径
        const mapped = SIZE_MAPPINGS[inch];
        if (mapped) {
            return mapped[0];
        }
    }
    
    // 【v36.91修复】匹配 "数字CM/cm/厘米" 格式
    // 业务知识库 §5.6：cm 表示长度（如50cm管），不得误判为管径 DN
    // 例：50cm = 50厘米长的管段，不是 DN50 管径
    // 此处直接 return null，让长度由 extractLengthFromQuery 单独处理
    const cmMatch = text.match(/(\d{1,3})\s*(cm|厘米)\b/i);
    if (cmMatch) {
        return null; // cm = 长度，不是管径，不参与 DN 提取
    }
    
    // 5.【v33新增】匹配 "数字mm" 格式（如 PPR管25mm、50mm、110mm 等）
    // 这是最常见的管材报价输入方式！必须优先识别
    // 【v36.17修复】PPR产品DN编号就是外径(mm)本身，不需要映射！
    const mmMatch = text.match(/(\d{2,3})\s*mm\b/i);
    if (mmMatch) {
        const mmVal = mmMatch[1];
        const isPprContext = /ppr/i.test(text);
        
        // PPR上下文：DN编号就是外径(mm)，直接返回 dn+mm值
        if (isPprContext) {
            return `dn${mmVal}`;
        }
        
        // 非PPR上下文：使用标准映射表
        const mappedDn = MM_TO_DN_MAPPING[mmVal];
        if (mappedDn) {
            return mappedDn;
        }
        // 没有精确映射时，直接用 dn + 数字
        if (parseInt(mmVal) >= 10 && parseInt(mmVal) <= 500) {
            return `dn${mmVal}`;
        }
    }
    
    // 6.【关键补全】匹配裸数字 + 管件类型词（如 "50弯头"、"110三通"、"63管帽"）
    // 这是最常见的用户输入方式，必须识别才能触发尺寸硬性过滤
    const fittingKeywords = ['三通', '弯头', '直通', '套筒', '管帽', '四通', '大小头', '异径', '接头', '法兰', '阀门', '管子', '水管'];
    for (const kw of fittingKeywords) {
        const fitSizeMatch = text.match(new RegExp(`(\\d{1,4})\\s*${kw}`));
        if (fitSizeMatch) {
            const size = parseInt(fitSizeMatch[1]);
            if (size >= 10 && size <= 500) {
                // 【v36.41新增】PPR上下文：65↔63 近似映射
                // 产品库中可能只有dn63，但客户可能输入65
                const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
                if (isPprCtx && size === 65) {
                    return 'dn63'; // PPR产品：65近似到63
                }
                return `dn${size}`;
            }
        }
    }
    
    // 【v36.75新增】6.2 PPR/PVC 上下文中 "数字+管" / "数字+直接" 格式
    // 解决 "PPR 50管"、"PPR 25直接"、"PVC 110管" 等查询中数字无法提取的问题
    // 注意：需要排除 "管帽"、"管子"（已在 fittingKeywords 里处理）、"管件" 等复合词
    const pipeContextMatch = text.match(/(?:ppr|pvc|pe|pp-r)\s*[\w\s]*?(\d{2,3})\s*(?:管|直接|直通)(?:[^帽子件道])?\s*(?:$|\s)/i);
    if (pipeContextMatch) {
        const size = parseInt(pipeContextMatch[1]);
        if (size >= 10 && size <= 500) {
            const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
            if (isPprCtx && size === 65) return 'dn63';
            return `dn${size}`;
        }
    }
    // 更简单的兜底：材料关键词 + 空格 + 数字（2-3位） + 管/直接（结尾或接空白）
    const matNumPipeMatch = text.match(/(?:ppr|pvc|pe)\s+(\d{2,3})\s*(?:管|直接|直通)(?![帽子件道])/i);
    if (matNumPipeMatch) {
        const size = parseInt(matNumPipeMatch[1]);
        if (size >= 10 && size <= 500) {
            const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
            if (isPprCtx && size === 65) return 'dn63';
            return `dn${size}`;
        }
    }

    // 【v36.58新增】6.5 匹配 "数字 + 的 + 管件类型" 或 "管件类型 + 数字" 格式
    // 支持中文灵活表达：如 "弯头 25 的"、"25 弯头"、"PPR弯头25"
    for (const kw of fittingKeywords) {
        // 匹配 "数字 + 的 + 管件类型" 格式（如 "弯头 25 的"）
        const flexibleMatch1 = text.match(new RegExp(`(\\d{1,4})\\s*的\\s*${kw}`));
        if (flexibleMatch1) {
            const size = parseInt(flexibleMatch1[1]);
            if (size >= 10 && size <= 500) {
                const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
                if (isPprCtx && size === 65) {
                    return 'dn63';
                }
                return `dn${size}`;
            }
        }
        
        // 匹配 "管件类型 + 数字" 格式（如 "弯头25"、"PPR弯头25"）
        const flexibleMatch2 = text.match(new RegExp(`${kw}\\s*(\\d{1,4})`));
        if (flexibleMatch2) {
            const size = parseInt(flexibleMatch2[1]);
            if (size >= 10 && size <= 500) {
                const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
                if (isPprCtx && size === 65) {
                    return 'dn63';
                }
                return `dn${size}`;
            }
        }
    }
    
    // 7. 匹配独立的数字规格（如 coupling 20 或 20 个）
    // 【v36.75扩展】同时覆盖 "数字+管" 结尾且有材料上下文的情况（如 "PPR 50 管"）
    const standaloneMatch = text.match(/(?:^|\s)(\d{2,3})(?:\s*$|\s+(?:个|pcs|piece|item)|\s*管(?![帽子件道]))/i);
    if (standaloneMatch) {
        const size = parseInt(standaloneMatch[1]);
        // 【v36.41新增】PPR上下文：65↔63 近似映射
        const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
        if (isPprCtx && size === 65) {
            return 'dn63';
        }
        return `dn${size}`;
    }
    
    // 【v36.7新增】7.5 匹配括号后的数字规格（如 "八角盒（单通）25" 中的 25）
    // 这是电工产品常见的尺寸标注方式
    const afterBracketMatch = text.match(/[）\)]\s*(\d{2,3})(?:[^\d]|$)/);
    if (afterBracketMatch) {
        const size = parseInt(afterBracketMatch[1]);
        if (size >= 10 && size <= 500) {
            // 【v36.41新增】PPR上下文：65↔63 近似映射
            const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
            if (isPprCtx && size === 65) {
                return 'dn63';
            }
            return `dn${size}`;
        }
    }
    
    // 8. 匹配 "数字+管子" 格式（如 50管子、40管子）
    const pipeMatch = text.match(/(\d{2,3})\s*管子/);
    if (pipeMatch) {
        const size = parseInt(pipeMatch[1]);
        // 【v36.41新增】PPR上下文：65↔63 近似映射
        const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
        if (isPprCtx && size === 65) {
            return 'dn63';
        }
        return `dn${size}`;
    }
    
    // 9.【v33新增】匹配 "数字+管" 或 "数字+根" 格式（如 PPR管25mm根50、PPR管50mm根2）
    // 提取带 mm 单位的管材规格
    const pipeWithMm = text.match(/ppr\s*管\s*\d*mm?\s*(\d{2,3})\s*mm?/i);
    if (pipeWithMm) {
        const size = pipeWithMm[1];
        const mappedDn = MM_TO_DN_MAPPING[size];
        if (mappedDn) return mappedDn;
        return `dn${size}`;
    }
    
    // 【v36.32新增】10. 匹配 "数字*数字" 或 "数字×数字" 格式（如接线盒 86*86、86×86）
    // 这是电工产品（接线盒、开关盒）常用的长×宽尺寸标注方式
    const boxSizeMatch = text.match(/(\d{2,3})\s*[\*×x]\s*(\d{2,3})/);
    if (boxSizeMatch) {
        const w = parseInt(boxSizeMatch[1]);
        const h = parseInt(boxSizeMatch[2]);
        // 返回格式：wxh（如 86x86），用于后续尺寸匹配
        if (w >= 50 && h >= 50 && w <= 200 && h <= 200) {
            return `${w}x${h}`;
        }
    }

    return null;
}

// 提取异径规格（如 50*20）
function extractReducerSize(text) {
    if (!text) return null;
    text = text.toLowerCase();
    // 【v36.77新增】引号归一化：将各种弯引号/特殊引号统一替换为直引号 "
    text = text.replace(/[\u201c\u201d\u2033\u301e]/g, '"');
    
    // 【v36.69新增】⌀ 符号（U+2300）预处理：将 ⌀110 转换为对应的 DN 值
    // 这样后续逻辑可以正常处理，如 ⌀110*50 → dn100*50
    text = text.replace(/\u2300\s*(\d+)/g, (match, mm) => {
        const mappedDn = MM_TO_DN_MAPPING[mm];
        return mappedDn ? mappedDn.replace('dn', '') : mm;
    });
    
    // ===== -0.5【v36.80新增】"ke" 分隔符异径英寸格式 =====
    // 印尼语 "ke" = "到"，常见格式：½"ke¾"、¾"ke1"、1/2"ke3/4"
    // 支持 Unicode 分数字符（½¼¾）和普通分数（1/2、3/4）
    // 必须在 hasInchContext 检测之前处理，否则会走到纯数字匹配逻辑
    const kePattern = /([\u00bc\u00bd\u00be]|\d+(?:-\d+)?\/\d+|\d+)\s*"?\s*ke\s*([\u00bc\u00bd\u00be]|\d+(?:-\d+)?\/\d+|\d+)\s*"?/i;
    const keMatch = text.match(kePattern);
    if (keMatch) {
        const specialInchMap = {'\u00bd': '1/2"', '\u00bc': '1/4"', '\u00be': '3/4"'};
        // 【v36.81修复】Plock sock 是 PPR 产品常用关键词，当查询包含 plock/sock 时自动启用 PPR 语境
        // 原因：用户查询 "Plock sock 变径直接 ½"ke¾"" 应匹配 PPR 产品（dn25x20 = ¾"×1/2"）
        // 若不启用 PPR 语境：½"→dn15, ¾"→dn20，无法匹配 dn25x20
        const isPprCtx = /ppr|plock|sock/i.test(text);
        function _keInchToStr(raw) {
            if (specialInchMap[raw]) return specialInchMap[raw];
            if (/^\d+$/.test(raw)) return raw + '"';   // 整数英寸
            if (raw.includes('/')) return raw + '"';    // 分数英寸
            return null;
        }
        const largeInch = _keInchToStr(keMatch[1]);
        const smallInch = _keInchToStr(keMatch[2]);
        if (largeInch && smallInch) {
            const largeDn = inchToDN(largeInch.replace('"',''), isPprCtx) || (SIZE_MAPPINGS[largeInch] && SIZE_MAPPINGS[largeInch][0]);
            const smallDn = inchToDN(smallInch.replace('"',''), isPprCtx) || (SIZE_MAPPINGS[smallInch] && SIZE_MAPPINGS[smallInch][0]);
            if (largeDn && smallDn && largeDn !== smallDn) {
                const l = largeDn.replace('dn','');
                const s = smallDn.replace('dn','');
                return {
                    large: l,
                    small: s,
                    full: `dn${l}*dn${s}`,
                    largeVariants: getSizeVariants(l),
                    smallVariants: getSizeVariants(s)
                };
            }
        }
    }

    // ===== 0.【v33.2新增】先检查是否有英寸/寸的上下文 =====
    // 如果文本中包含"寸"字或分数格式(如 2-1/2)，优先走英寸异径逻辑
    const hasInchContext = /寸|[""]|\d+\/\d+|\u00bd|\u00bc|\u00be/.test(text);  // 【v36.12学习LEKE报价单】新增Unicode特殊字符：½¼¾
    
    // ===== 0.5【v36.12学习LEKE报价单】DN + 特殊字符英寸格式 =====
    // 支持格式：DN25*½、dn20*¼、DN50*¾（Unicode特殊字符英寸）
    const specialInchMatch = text.match(/(?:dn|de)\s*(\d+)\s*[\*x×]\s*[½¼¾]/i);
    if (specialInchMatch) {
        const dnNum = specialInchMatch[1];
        // 特殊字符英寸值映射
        const specialInchMap = {
            '½': '1/2"',
            '¼': '1/4"', 
            '¾': '3/4"'
        };
        // 找到匹配的特殊字符
        const matchedChar = text.match(/[½¼¾]/);
        if (matchedChar) {
            const inchValue = specialInchMap[matchedChar[0]];
            const isPprContext = /ppr/i.test(text);
            let smallDn = null;
            
            // 转换英寸到DN
            if (isPprContext && INCH_TO_PPR_DN[inchValue]) {
                smallDn = INCH_TO_PPR_DN[inchValue].replace('dn', '');
            } else if (SIZE_MAPPINGS[inchValue]) {
                smallDn = SIZE_MAPPINGS[inchValue][0].replace('dn', '');
            }
            
            if (smallDn && dnNum !== smallDn) {
                return {
                    large: dnNum,
                    small: smallDn,
                    full: `dn${dnNum}x${smallDn}`,
                    largeVariants: getSizeVariants(dnNum),
                    smallVariants: getSizeVariants(smallDn)
                };
            }
        }
    }

    // ===== 1. 纯数字异径格式：110*50、50x20、DN50x20、dn63/60 等（原有逻辑）=====
    // 【重要修正】如果有英寸上下文，跳过此步避免把 4*2寸 当成 DN4*DN2
    // 【v36新增】支持 / 分隔符（如 dn63/60、110/50）
    // 【v35.3修复】如果两个数字相等(如 50*50、dn20/20)，这是等径三通/等径产品，不是异径！
    let numMatch;
    if (!hasInchContext) {
        // 【v36.68新增】支持 - 分隔符（如 DN150-100、PE热熔大小头 DN150-80）
        // 【v36】优先匹配 / 分隔符（避免被后面的 * 匹配逻辑干扰）
        numMatch = text.match(/(\d+)\s*[-]\s*(\d+)/);
        if (!numMatch) {
            numMatch = text.match(/(\d+)\s*[\/]\s*(\d+)/);
        }
        if (!numMatch) {
            numMatch = text.match(/(\d+)\s*[\*x×]\s*(\d+)/);
            // 【v36.86新增】排除角度数字被误识别为异径小端（如 110*45度弯头）
            if (numMatch) {
                const afterSmall = text.substring(numMatch.index + numMatch[0].length);
                if (/^\s*[度°]/.test(afterSmall)) {
                    numMatch = null; // 小端数字是角度，不当作异径处理
                }
            }
        }
        if (!numMatch) {
            // 【v36.76新增】支持 "变" 作为异径分隔符（如 dn63变25、63变25）
            numMatch = text.match(/(\d+)\s*变\s*(\d+)/);
        }
        if (numMatch) {
            let n1 = numMatch[1];
            let n2 = numMatch[2];
            
            // 【v35.3】三数字等径格式检测：dn50*50*50 或 dn20*20*20
            // 这是等径三通的完整写法（三个口尺寸相同），不应作为异径处理
            const tripleEqualMatch = text.match(new RegExp(
                `(?:dn)?${n1}\\s*[\\*x×]\\s*${n1}\\s*[\\*x×]\\s*${n1}`, 'i'
            ));
            if (tripleEqualMatch) {
                // 三数字等径 → 返回 null（让 extractSize 处理为单尺寸）
                return null;
            }
            
            // 【v36.37新增】三数字异径格式检测：50*50*32、40*40*25、110*50*110
            // 这是异径三通的完整写法（大端*大端*小端 或 大端*小端*大端）
            // 只要三个数字不全相等，就是异径三通
            const tripleReducerMatch = text.match(/(\d{2,4})\s*[\*x×]\s*(\d{2,4})\s*[\*x×]\s*(\d{2,4})/);
            if (tripleReducerMatch) {
                const d1 = tripleReducerMatch[1];
                const d2 = tripleReducerMatch[2];
                const d3 = tripleReducerMatch[3];
                
                // 如果三个数字全相等 → 等径三通（已在上面处理）
                // 如果三个数字不全相等 → 异径三通
                if (d1 === d2 && d2 === d3) {
                    // 等径，已在上面处理，这里不应该走到
                    return null;
                }
                
                // 异径三通：找出大端和小端
                // 格式通常是 大*大*小 或 大*小*大
                if (d1 === d2) {
                    // 50*50*32 格式：d1=d2=大端，d3=小端
                    n1 = d1;  // 大端
                    n2 = d3;  // 小端
                } else if (d1 === d3) {
                    // 110*50*110 格式：d1=d3=大端，d2=小端
                    n1 = d1;  // 大端
                    n2 = d2;  // 小端
                } else if (d2 === d3) {
                    // 32*50*50 格式：d2=d3=大端，d1=小端
                    n1 = d2;  // 大端
                    n2 = d1;  // 小端
                } else {
                    // 三个数字都不相等，取最大值为大端，最小值为小端
                    const nums = [parseInt(d1), parseInt(d2), parseInt(d3)];
                    n1 = String(Math.max(...nums));  // 大端
                    n2 = String(Math.min(...nums));  // 小端
                }
            }
            
            // 两数字相等也是等径（如 dn50*50），不是异径
            if (n1 === n2) {
                return null; // 等径，不当作异径处理
            }
            
            // 【v36.10新增】日标 DN 转换
            const isJisContext = /pvc-u|upvc|日标|jis|排水/i.test(text);
            if (isJisContext) {
                const jisMmToDn = {
                    '110': '100', '160': '150', '200': '200', '250': '250', '315': '300',
                    '50': '50', '75': '75'
                };
                if (jisMmToDn[n1]) n1 = jisMmToDn[n1];
                if (jisMmToDn[n2]) n2 = jisMmToDn[n2];
            }
            
            // 【v36.46新增】PPR/PE上下文：标准公称直径(DN) → 外径编号转换
            // 例：查询"DN25*15" → 转换为"dn25*20"（PPR/PE产品库使用外径mm作为编号）
            // PE: DN150→dn160, DN100→dn110, DN80→dn90
            // PPR: DN15→dn20, DN32→dn40, DN100→dn110
            // 【v36.65修正】只有明确带 DN 前缀时才转换，裸数字（如40×32）直接就是PPR dn编号
            // 【v36.68扩展】PE 上下文也做标准DN→外径转换（与PPR共用同一映射表）
            const isPprCtx = /ppr|pp-r|pp_r/i.test(text);
            const isPeCtx = /pe|hdpe|聚乙烯|热熔/i.test(text);
            const hasDnPrefix = /dn\s*\d/i.test(text);  // 是否有明确的 DN 前缀
            
            if ((isPprCtx || isPeCtx) && hasDnPrefix) {
                if (STANDARD_DN_TO_PPR_DN[n1]) n1 = STANDARD_DN_TO_PPR_DN[n1].replace('dn', '');
                if (STANDARD_DN_TO_PPR_DN[n2]) n2 = STANDARD_DN_TO_PPR_DN[n2].replace('dn', '');
                
                // 【v36.68】PE 额外映射：PPR表中没有的大尺寸PE规格
                if (isPeCtx) {
                    const peExtraDnMap = {
                        '125': '140',   // DN125 → dn140(PE)
                        '150': '160',   // DN150 → dn160(PE)
                        '200': '225',   // DN200 → dn225(PE)
                        '250': '280',   // DN250 → dn280(PE)
                        '300': '315',   // DN300 → dn315(PE)
                    };
                    if (peExtraDnMap[n1]) n1 = peExtraDnMap[n1];
                    if (peExtraDnMap[n2]) n2 = peExtraDnMap[n2];
                }
            }
            
            // 【v36.52新增】De（外径）→ DN 转换
            // 检查查询中是否有 De 前缀，如果有，将外径值转换为 DN
            // 【v36.74修复】PPR上下文：de=dn（数字=外径mm=PPR产品编号），不做MM_TO_DN转换
            const hasDePrefix = /de\s*\d+/i.test(text);
            if (hasDePrefix) {
                const isPprDeCtx = /ppr|pp-r|pp_r/i.test(text);
                if (!isPprDeCtx) {
                    // 非PPR场景才做外径→DN转换
                    if (MM_TO_DN_MAPPING[n1]) n1 = MM_TO_DN_MAPPING[n1].replace('dn', '');
                    if (MM_TO_DN_MAPPING[n2]) n2 = MM_TO_DN_MAPPING[n2].replace('dn', '');
                }
                // PPR场景：n1/n2保持原值，不做转换（de25*20 → dn25*20）
            }

            // 【v36.73新增】PVC-U/日标/排水上下文：裸数字外径mm → DN转换
            // 例："160*110大小头" → 160=DN150(6"), 110=DN100(4") → 匹配 DN150x100
            // 注意：De前缀已在上面处理过，这里处理无前缀但属于PVC/日标/排水场景的外径值
            const isJisReducerContext = /pvc-u|upvc|pvc|日标|jis|排水|大小头|异径套/i.test(text);
            if (!hasDePrefix && isJisReducerContext) {
                // 日标PVC-U外径(mm) → 公称DN映射（与第3步回退逻辑一致）
                const jisMmToDn = {
                    '110': '100', '160': '150', '200': '200', '250': '250',
                    '315': '300', '50': '50', '75': '75'
                };
                if (jisMmToDn[n1] && parseInt(n1) > 40) n1 = jisMmToDn[n1];
                if (jisMmToDn[n2] && parseInt(n2) > 40) n2 = jisMmToDn[n2];
            }
            
            return {
                large: n1,
                small: n2,
                full: `${n1}*${n2}`,
                largeVariants: getSizeVariants(n1),
                smallVariants: getSizeVariants(n2)
            };
        }
    }
    
    // ===== 2. 英寸/寸 异径格式 =====
    // 支持格式：
    //   - "4*2寸" / "4×2寸" / "4x2寸"
    //   - "2-1/2*2寸" / "2-1/2*1-1/2寸" (带分数)
    //   - "5*4寸(日标)" (带括号备注)
    //   - "4寸*2寸"
    //   - "1变3/4英寸" / "2变1英寸" (整数+变+分数/整数英寸)
    
    // 【v36.35新增】模式0: "1变3/4英寸" / "2变1英寸" 格式（整数+变+分数/整数英寸）
    // 例：变径直通(1变3/4英寸) → 大端1"，小端3/4"
    const chineseReducerMatch = text.match(/(\d+)\s*变\s*(\d+(?:-\d+)?\/\d+|\d+)\s*(?:英寸|寸)?/);
    if (chineseReducerMatch) {
        const rawLarge = chineseReducerMatch[1];      // 大端原始值（整数）
        const rawSmall = chineseReducerMatch[2];      // 小端原始值（分数或整数）
        
        // 检测PPR上下文
        const isPprContext = /ppr/i.test(text);
        
        // 将英寸转换为 DN（PPR模式使用外径编号）
        const largeDn = inchToDN(rawLarge, isPprContext);
        const smallDn = inchToDN(rawSmall, isPprContext);
        
        if (largeDn && smallDn && largeDn !== smallDn) {
            return {
                large: largeDn.replace('dn', ''),
                small: smallDn.replace('dn', ''),
                full: `${largeDn}*${smallDn}`,
                largeVariants: getSizeVariants(largeDn.replace('dn', '')),
                smallVariants: getSizeVariants(smallDn.replace('dn', ''))
            };
        }
    }
    
    // 先提取英寸值（支持整数、纯分数、带连字符分数）
    // 【v36.78修复】原来只支持 整数 或 整数-分数(如2-1/2)，不支持纯分数(如1/2、3/4)
    // 修复后：(\d+\/\d+|\d+-\d+\/\d+|\d+) — 优先匹配纯分数，再匹配带连字符分数，最后整数
    const inchPattern = '(\\d+\\/\\d+|\\d+-\\d+\\/\\d+|\\d+)';
    
    // 【v36.78新增】模式三段：英寸异径三通完整写法（大*小*小 / 大*大*小 等三段形式）
    // 如：1/2*3/4*3/4寸、1*1/2*1/2寸、3/4*1/2*1/2寸
    // 三段英寸异径三通：找出大端和小端（两个相等的是大端，另一个是小端）
    // 【v36.78b修复】使用字面量正则而非 new RegExp，避免字符串转义问题
    const tripleInchPattern = /(\d+\/\d+|\d+-\d+\/\d+|\d+)\s*[\*x×]\s*(\d+\/\d+|\d+-\d+\/\d+|\d+)\s*[\*x×]\s*(\d+\/\d+|\d+-\d+\/\d+|\d+)\s*(?:寸|")?/;
    const tripleInchMatch = text.match(tripleInchPattern);
    if (tripleInchMatch) {
        const r1 = tripleInchMatch[1];
        const r2 = tripleInchMatch[2];
        const r3 = tripleInchMatch[3];
        const isPprCtx = /ppr/i.test(text);
        const dn1 = inchToDN(r1, isPprCtx);
        const dn2 = inchToDN(r2, isPprCtx);
        const dn3 = inchToDN(r3, isPprCtx);
        if (dn1 && dn2 && dn3) {
            let largeDn, smallDn;
            if (dn1 === dn2) { largeDn = dn1; smallDn = dn3; }
            else if (dn1 === dn3) { largeDn = dn1; smallDn = dn2; }
            else if (dn2 === dn3) { largeDn = dn2; smallDn = dn1; }
            else {
                // 三段都不等：取最大为大端，最小为小端
                const vals = [dn1, dn2, dn3].map(d => parseInt(d.replace('dn', '')));
                largeDn = 'dn' + Math.max(...vals);
                smallDn = 'dn' + Math.min(...vals);
            }
            if (largeDn !== smallDn) {
                return {
                    large: largeDn.replace('dn', ''),
                    small: smallDn.replace('dn', ''),
                    full: `${largeDn}*${smallDn}`,
                    largeVariants: getSizeVariants(largeDn.replace('dn', '')),
                    smallVariants: getSizeVariants(smallDn.replace('dn', ''))
                };
            }
        }
    }
    
    // 【v36.78新增】模式0: 带引号的英寸异径格式 "1" × 1/2"、"1"*1/2"
    // 这是 PPR 产品最常见的异径标注方式，如 "1" × 1/2"" 表示 1"×1/2" 异径三通
    // 正则匹配：数字+引号 *或× 分数+引号（如 1"×1/2"、2"×3/4"）
    const quotedInchReducer = text.match(/(\d+(?:-\d+)?\s*)\s*["\u201c]\s*[x×\*]\s*(\d+(?:-\d+)?\s*)\s*["\u201c]/);
    if (quotedInchReducer) {
        const rawLarge = quotedInchReducer[1].trim();    // 大端原始值（如 "1" 中的 1）
        const rawSmall = quotedInchReducer[2].trim();    // 小端原始值（如 "1/2" 中的 1/2）
        
        const isPprContext = /ppr/i.test(text);
        
        // 将英寸转换为 DN（PPR模式使用外径编号）
        const largeDn = inchToDN(rawLarge, isPprContext);
        const smallDn = inchToDN(rawSmall, isPprContext);
        
        if (largeDn && smallDn && largeDn !== smallDn) {
            return {
                large: largeDn.replace('dn', ''),
                small: smallDn.replace('dn', ''),
                full: `${largeDn}*${smallDn}`,
                largeVariants: getSizeVariants(largeDn.replace('dn', '')),
                smallVariants: getSizeVariants(smallDn.replace('dn', ''))
            };
        }
    }
    
    // 模式A: "4*2寸" 或 "4*2" 后面跟 寸（整体在寸上下文中）
    // 【v36.78b修复】使用字面量正则，避免 new RegExp 字符串转义问题
    const inchReducerPatternA = /(\d+\/\d+|\d+-\d+\/\d+|\d+)\s*[\*x×]\s*(\d+\/\d+|\d+-\d+\/\d+|\d+)/;
    const inchReducerA = text.match(inchReducerPatternA);

    // 模式B: "4寸*2寸" 或 "4寸*2"
    const inchReducerPatternB = /(\d+\/\d+|\d+-\d+\/\d+|\d+)(寸)?\s*[\*x×]\s*(\d+\/\d+|\d+-\d+\/\d+|\d+)(寸)?/;
    const inchReducerB = text.match(inchReducerPatternB);
    
    const match = inchReducerA || inchReducerB;
    if (match) {
        const rawLarge = match[1];      // 大端原始值
        const rawSmall = match[2];      // 小端原始值
        
        // 【v35.1新增】检测PPR上下文
        const isPprContext = /ppr/i.test(text);
        
        // 将英寸转换为 DN（PPR模式使用外径编号）
        const largeDn = inchToDN(rawLarge, isPprContext);
        const smallDn = inchToDN(rawSmall, isPprContext);
        
        if (largeDn && smallDn && largeDn !== smallDn) {
            return {
                large: largeDn.replace('dn', ''),
                small: smallDn.replace('dn', ''),
                full: `${largeDn}*${smallDn}`,
                largeVariants: getSizeVariants(largeDn.replace('dn', '')),
                smallVariants: getSizeVariants(smallDn.replace('dn', ''))
            };
        }
    }
    
    // ===== 3. 没有英寸上下文时，回退到纯数字匹配 =====
    // （处理没有"寸"字但确实是数字异径的情况）
    // 【v36新增】也支持 / 分隔符
    numMatch = text.match(/(\d{2,4})\s*[\/\*x]\s*(\d{2,4})/);
    if (numMatch) {
        const large = parseInt(numMatch[1]);
        const small = parseInt(numMatch[2]);
        // 确保是合理的管件规格范围
        if (large >= 10 && small >= 10 && large <= 500 && small <= 500) {
            // 【v36.10新增】检测PVC-U/日标语境，进行mm→DN转换
            // 如 dn110 → DN100（日标外径110mm = DN100 = 4寸）
            const isJisContext = /pvc-u|upvc|日标|jis|排水/i.test(text);
            let largeDn = numMatch[1];
            let smallDn = numMatch[2];
            
            if (isJisContext) {
                // 日标mm→DN映射（外径→公称直径）
                const jisMmToDn = {
                    '110': '100',  // φ110 = DN100 = 4寸
                    '160': '150',  // φ160 = DN150 = 6寸
                    '200': '200',  // φ200 = DN200 = 8寸
                    '250': '250',  // φ250 = DN250 = 10寸
                    '315': '300',  // φ315 = DN300 = 12寸
                    '50': '50',    // φ50 = DN50 = 2寸
                    '75': '75',    // φ75 = DN75 = 2-1/2寸（特殊）
                };
                if (jisMmToDn[largeDn]) largeDn = jisMmToDn[largeDn];
                if (jisMmToDn[smallDn]) smallDn = jisMmToDn[smallDn];
            }
            
            return {
                large: largeDn,
                small: smallDn,
                full: `${largeDn}*${smallDn}`,
                largeVariants: getSizeVariants(largeDn),
                smallVariants: getSizeVariants(smallDn)
            };
        }
    }
    
    return null;
}

// 英寸值 → DN 转换辅助函数
// 【v35.1修复】增加 pprMode 参数，PPR产品使用外径作为DN编号
// 【v36.78c修复】使用 \u0022 代替直接引号，避免编码问题
function inchToDN(inchVal, pprMode = false) {
    // 处理分数格式如 "2-1/2"、"1-1/4"
    let normalizedInch;
    if (inchVal.includes('-') || inchVal.includes('/')) {
        // 分数英寸格式，加引号查表
        normalizedInch = inchVal + '\u0022';

        // PPR模式：优先用PPR映射
        if (pprMode && INCH_TO_PPR_DN[normalizedInch]) {
            return INCH_TO_PPR_DN[normalizedInch];
        }
    } else if (/^\d+$/.test(inchVal)) {
        // 纯整数 → 用俗称映射
        const aliasKey = inchVal + '寸';
        const inchStr = ALIAS_TO_INCH[aliasKey];
        if (inchStr) {
            // PPR模式：优先用PPR映射
            if (pprMode && INCH_TO_PPR_DN[inchStr]) {
                return INCH_TO_PPR_DN[inchStr];
            }
            const mapped = SIZE_MAPPINGS[inchStr];
            if (mapped) return mapped[0];
        }
        // 兜底：直接用 dn + 数字
        return 'dn' + inchVal;
    }

    // 尝试直接用英寸格式查 SIZE_MAPPINGS
    if (normalizedInch && SIZE_MAPPINGS[normalizedInch]) {
        return SIZE_MAPPINGS[normalizedInch][0];
    }

    return null;
}

// 获取规格的近似变体（处理65≈63等近似值，以及英寸等价值）
function getSizeVariants(size) {
    const sizeNum = parseInt(size);
    const variants = [size]; // 原始值
    
    // 常见近似映射
    const approxMappings = {
        '65': ['63', '65'],
        '63': ['63', '65'],
        '35': ['32', '35'],
        '32': ['32', '35'],
        '22': ['20', '22'],
        '20': ['20', '22']
    };
    
    // 【v36.70新增】PPR 外径 → 英寸等价值
    // 内螺纹弯头等产品名称中小端用英寸标注（如 dn32x1/2"），需要能和数字尺寸互相匹配
    const pprOdToInch = {
        '20': ['1/2"', '1/2'],
        '25': ['3/4"', '3/4'],
        '32': ['1"',   '1'],
        '40': ['1-1/4"', '1-1/4'],
        '50': ['1-1/2"', '1-1/2'],
        '63': ['2"',   '2'],
        '75': ['2-1/2"', '2-1/2'],
        '90': ['3"',   '3'],
        '110': ['4"',  '4'],
    };
    
    const baseList = approxMappings[size]
        ? [...new Set([...variants, ...approxMappings[size]])]
        : variants;
    
    // 把所有基础变体对应的英寸值也加入
    const result = [...baseList];
    for (const base of baseList) {
        if (pprOdToInch[base]) {
            result.push(...pprOdToInch[base]);
        }
    }
    
    return [...new Set(result)];
}

// 提取材料类型
// 【v36.43修复】使用单词边界匹配PE，避免"pe"匹配到"pipe"
function extractMaterial(text) {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('upvc') || /\bpvc\b/.test(lowerText)) return 'pvc';
    if (/\bppr\b/.test(lowerText) || lowerText.includes('pp-r')) return 'ppr';
    // 【v36.43修复】PE必须用单词边界匹配，避免匹配"pipe"中的"pe"
    if (/\bpe\b/.test(lowerText) || lowerText.includes('hdpe') || lowerText.includes('pex')) return 'pe';
    return null;
}

// 【v36.44新增】提取连接方式（PE产品专用）
// 连接方式：电熔(electro-fusion) vs 对接(butt-fusion)
function extractConnectionType(text) {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    
    // 电熔连接标识
    if (/电熔|电容|electro[\s\-]?fusion/i.test(lowerText)) {
        return 'electrofusion';
    }
    
    // 对接连接标识
    if (/对接|butt[\s\-]?fusion/i.test(lowerText)) {
        return 'buttfusion';
    }
    
    return null;
}

// 【v36.56新增】从查询中提取长度单位（如 6米/根、4M/根、5.8M/根）
// 用于管材长度精确匹配
function extractLengthFromQuery(text) {
    if (!text) return null;
    const lowerText = text.toLowerCase();
    
    // 匹配各种长度格式：6米/根、4M/根、5.8M/根、6m/根、4M/pcs 等
    const lengthMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:米|m)\s*\/(根|pcs)/i);
    if (lengthMatch) {
        return {
            value: parseFloat(lengthMatch[1]),
            unit: lengthMatch[2].toLowerCase(),
            raw: `${lengthMatch[1]}M/${lengthMatch[2]}`
        };
    }
    
    return null;
}

// 提取用途（产品用途分类）
// 【v36.2扩展】支持更多电线/电气产品识别
function extractUsage(text) {
    if (!text) return null;
    text = text.toLowerCase();
    
    // === 电线/电气类（优先检测，因为最具体）===
    // 线管、接线盒、底盒等都是电气安装配件
    const electricalKeywords = [
        '线管', '电线管', '电工管', 'conduit', 'electrical',
        // 【v36.2新增】接线盒系列
        '八角盒', '底盒', '线盒', '接线盒', '开关盒', '插座盒',
        '暗盒', '明盒', '灯头盒', '分线盒', '过路盒', '中间盒',
        'junction box', 'switch box', 'socket box',
        // 其他电气配件
        '弯管弹簧', '弹簧'
    ];
    for (const kw of electricalKeywords) {
        if (text.includes(kw)) return 'conduit';
    }
    
    // 给水类
    if (text.includes('给水') || text.includes('water') || text.includes('aw')) {
        return 'water';
    }
    // 排水类
    if (text.includes('排水') || text.includes('drain') || text.includes('dwv')) {
        return 'drain';
    }
    
    return null;
}

// 提取管件类型（支持别名映射）
// 【v36.3学习华龙报价单】客户口语→标准品名映射优化
function extractFittingType(text) {
    if (!text) return null;
    text = text.toLowerCase();
    
    // 【v36.79新增】英文缩写/工程简写预处理（在所有别名判断之前）
    // 工程报价单常见写法：T=Tee三通, E=Elbow弯头, R/RS=Reducer异径套, C/CP=Coupling直通,
    // 45E=45°弯头, 90E=90°弯头, ET=等径三通, RT=异径三通, RS/RD=异径套
    // 匹配格式：材料+尺寸+缩写，如 "PPR DN20 T"，"UPVC 110 E"，"PE 63*40 R"
    // 注意：单独出现的 T/E/R/C 字母不映射（避免误匹配"PVC"中的C等）
    // 判断条件：字母缩写出现在词尾或被空格/数字包围时才识别
    const engAbbrevMap = [
        // 三通系列
        [/\bequal\s*tee\b|\beq\.?\s*tee\b|\bET\b/i, '90°等径三通'],
        [/\bRT\b|\breducing\s*tee\b|\bred\.?\s*tee\b/i, '90°异径三通'],
        [/\bLT\b|\blarge\s*radius\s*tee\b/i, '顺水三通'],
        [/\bYT\b|\bY\s*branch\b|\by-branch\b/i, '45°斜三通'],
        [/(?:^|[\s\d\/])T(?:\s|$|\d)/i, '三通'],  // 单独T
        [/\btee\b/i, '三通'],                        // 完整单词tee
        // 弯头系列
        [/\b90\s*[°]?\s*E(?:LB(?:OW)?)?\b/i, '90°弯头'],
        [/\b45\s*[°]?\s*E(?:LB(?:OW)?)?\b/i, '45°弯头'],
        [/\bFTE\b|\bfemale\s*thread\s*elbow\b|\bint(?:ernal)?\s*thread\s*elbow\b/i, '内螺纹弯头'],
        [/\bMTE\b|\bmale\s*thread\s*elbow\b|\bext(?:ernal)?\s*thread\s*elbow\b/i, '外螺纹弯头'],
        [/(?:^|[\s\d\/])E(?:\s|$|\d)/i, '弯头'],   // 单独E
        [/\belbow\b/i, '弯头'],                      // 完整单词elbow
        // 异径套系列
        [/\bRS\b|\bRD\b|\breducing\s*socket\b|\breducing\s*coupler\b/i, '异径套'],
        [/(?:^|[\s\d\/])R(?:\s|$|\d)/i, '异径套'],  // 单独R
        [/\breducer\b|\breducing\b/i, '异径套'],
        // 直通/接头系列
        [/\bCP\b|\bstraight\s*coupling\b|\bequal\s*coupling\b/i, '直通'],
        [/(?:^|[\s\d\/])C(?:\s|$|\d)/i, '直通'],    // 单独C
        [/\bcoupling\b/i, '直通'],
        // 管帽/堵头
        [/\bEP\b|\bend\s*cap\b|\bpipe\s*cap\b/i, '管帽'],
        [/\bTP\b|\bthread\s*plug\b|\bthreaded\s*plug\b/i, '螺纹堵头'],
        // 法兰套
        [/\bFL\b(?!\w)|\bflange\s*socket\b/i, '法兰套'],
    ];
    
    for (const [pattern, fittingType] of engAbbrevMap) {
        if (pattern.test(text)) {
            return fittingType;
        }
    }
    
    // 【v36修复】PPR上下文特殊处理：PPR堵头=螺纹堵头（不是管帽！）
    const isPprContext = /ppr/i.test(text);
    // 【v36.3新增】检测排水/PVC-U 上下文（影响正三通的映射方向）
    // 【v36.23e学习华龙冷凝水报价单】新增"冷凝水"作为排水语境触发词
    const isDrainContext = /排水|drain|dwv|pvc-u.*d|冷凝水/i.test(text);
    
    // 别名映射表（按优先级排序：长的先匹配）
    // 【v36.4】从4.20报价单学习电工产品别名
    // 【v36.9修正】使用 Map 并按长度降序排列，确保"内丝弯头"先于"内丝"匹配！
    const aliasMap = new Map([
        // === 【v36.9】优先匹配完整词组（长的先匹配）===
        ['内丝弯头', '内螺纹弯头'],
        ['外丝弯头', '外螺纹弯头'],
        ['排水正三通', '顺水三通'],
        ['排水顺水三通', '顺水三通'],
        ['短型顺水', '顺水三通'],
        
        // === 【v36.4新增】电工产品别名（PVC线管/接线盒系列）===
        ['PVC线管', 'PVC电线管'],
        ['PVC管', 'PVC电线管'],
        ['直通接头', '直通'],
        ['直接头', '直通'],
        ['变径直接', '异径套'],  // 【v36.79新增】变径直接=异径套（长词优先，必须在"直接→直通"前）
        ['变径接头', '异径套'],  // 【v36.79新增】变径接头=异径套（客户俗称）
        ['直接', '直通'],
        ['直节', '直通'],  // 【v36.78e新增】直节=直通（客户俗称）
        ['马鞍管卡', 'U型管夹'],
        ['管卡', 'U型管夹'],
        ['杯梳', '管接头'],
        ['锁母', '管接头'],
        ['锁扣', '管接头'],
        ['螺节', '管接头'],  // 【v36.11学习SDI报价单】螺节=管接头
        ['单通', '单通接线盒'],
        ['角通', '双曲通接线盒'],
        ['塑料线盒', '开关盒'],
        
        // === 线管类 ===
        ['线管弹簧', '弯管弹簧'],
        ['弯管器', '弯管弹簧'],
        ['弹簧', '弯管弹簧'],
        ['穿线管', '电线管'],
        
        // === 通用管件别名 ===
        ['双节', '直通'],
        ['大小头', '异径'],
        ['异径管', '异径'],
        ['变径', '异径'],
        ['补芯', '异径套'],  // 【v36.90】补芯=大小头=异径套（客户俗称）
        ['变径直通', '异径套'],  // 【v36.35】变径直通=异径套（客户俗称）
        ['异径直接', '异径套'],  // 【v36.57】异径直接=异径套（客户俗称）
        ['内丝', '内螺纹'],
        ['外丝', '外螺纹'],
        ['外牙', '外螺纹'],
        ['承插式', '承插'],
        ['外螺纹接头', '外螺纹直接头'],
        ['外丝接头', '外螺纹直接头'],
        ['外牙直接', '外螺纹直接头'],
        ['法兰根', '法兰套'],  // 【v36.30】法兰根=法兰套（客户俗称）
        ['丝堵', '螺纹堵头'],  // 【v36.51】丝堵=螺纹堵头（客户俗称）
        ['管堵', '管帽'],  // 【v36.86】管堵=管帽（客户俗称/错别字）
        ['接古', '直通'],  // 【v36.86】接古=接箍=管箍=直通（客户错别字）
        
        // 【v36.23e学习华龙冷凝水报价单】新增别名
        ['直接头', '直通'],
        ['内丝接头', '内螺纹直接头'],
        ['同心异径接头', '异径套'],
        ['冷凝水管', '排水管'],
        ['空调冷凝水管', '排水管'],
        
        // 【v36】堵头不再在此映射，移到下面做上下文判断
        
        // === 【v36.14新增】胶水类别名 ===
        ['粘合剂', '胶水'],
        ['pipe cement', '胶水'],
        ['pvc胶', '胶水']
    ]);
    
    // 先检查别名映射（排除堵头，需要特殊处理）
    for (const [alias, standard] of aliasMap) {
        if (text.includes(alias)) {
            return standard;
        }
    }
    
    // ===== 【v36.3关键修正】正三通的上下文判断 =====
    // 华龙报价单证明：
    //   - PPR/给水语境："正三通" = "等径三通"（如 dn50*50*50 → 90°等径三通）✅ 原有逻辑正确
    //   - 排水/PVC-U语境："正三通" = "顺水三通"（如 UPVC排水正三通 → 短型顺水三通）❌ 原有逻辑错误！
    if (/正三通|等径三通/.test(text)) {
        if (isDrainContext) {
            return '顺水三通';   // 排水管件的正三通 = 顺水三通
        }
        return '90°等径三通';   // 默认（PPR/给水）：正三通 = 等径三通
    }
    
    // 弯头的角度别名
    if (text.includes('正弯头')) return '90°弯头';
    if (text.includes('斜弯头')) return '45°弯头';
    
    // 【v36】堵头的上下文判断（必须在通用别名检查后单独处理）
    // 【v36.86扩展】管堵也是堵头的一种俗称
    if (text.includes('堵头') || text.includes('管堵')) {
        if (isPprContext) {
            return '螺纹堵头';  // PPR堵头 = 螺纹管堵（带螺纹），不是管帽！
        }
        return '管帽';         // PVC等通用堵头 = 管帽
    }
    
    // 【v36.23c新增】保温材料类型
    if (/保温棉|保温材料|保温管|橡塑保温/i.test(text)) {
        return '保温材料';
    }
    
    // 标准管件类型（按长度降序排列，优先匹配更长的词）
    // 【v36.3新增】加入顺水三通、异径套等排水常用类型
    // 【v36.4新增】电工配件：U型管夹、管接头、接线盒系列
    // 【v36.7新增】接线盒通数类型：单通、双直通、双曲通
    // 【v36.8新增】内螺纹/外螺纹弯头（优先于普通弯头）
    const fittings = [
        '弯管弹簧', '顺水三通', '45°斜三通', '存水弯',  // 【v36.11学习SDI报价单】斜三通
        '双曲通接线盒', '双直通接线盒', '单通接线盒',  // 【v36.7】接线盒通数类型（优先匹配）
        '接线盒', '开关盒', '线盒',      // 【v36.4】电工盒类
        'U型管夹', '管卡',              // 【v36.4】管卡类
        '管接头', '锁母',               // 【v36.4】连接件
        '内螺纹弯头', '外螺纹弯头',     // 【v36.8】螺纹弯头（优先匹配）
        '底盒', '套筒', '接头', '阀门', '法兰套', '法兰', '管帽',  // 【v36.30】法兰套优先于法兰
        '胶水', '粘合剂',               // 【v36.14新增】胶水类
        '四通', '三通', '弯头', '直通'
    ];
    for (const fitting of fittings) {
        if (text.includes(fitting)) {
            return fitting;
        }
    }
    
    return null;
}

// 提取颜色
function extractColor(text) {
    if (!text) return null;
    text = text.toLowerCase();
    
    if (text.includes('白色') || text.includes('white')) return 'white';
    if (text.includes('灰色') || text.includes('grey') || text.includes('gray')) return 'grey';
    return null;
}

// 【v35.3新增】提取公称压力（PN / MPa）
// 支持格式：PN10、PN12.5、1.0MPa、1.25MPa、S5、S4 等
function extractPressure(text) {
    if (!text) return null;
    
    // 格式1：PN + 数字（如 PN12.5、pn10）
    const pnMatch = text.match(/(?:^|[^\w])PN\s*(\d+\.?\d*)/i);
    if (pnMatch) {
        return 'pn' + pnMatch[1];
    }
    
    // 格式2：MPa 格式（如 1.25MPa、1.0Mpa）
    const mpaMatch = text.match(/(\d+\.?\d*)\s*MPa/i);
    if (mpaMatch) {
        const mpaVal = mpaMatch[1];
        // 查表转换
        for (const [pn, info] of Object.entries(PN_MAPPING)) {
            if (info.mpa === mpaVal) return pn;
        }
        // 找不到就返回原始值
        return 'mpa' + mpaVal;
    }
    
    // 格式3：PPR S系列（如 S5=PN10, S4=PN12.5, S3.2=PN16, S2.5=PN20, S2=PN25）
    const sSeriesMatch = text.match(/(?:^|[\s(])S(\d+\.?\d*)(?=[\s)])/i);
    if (sSeriesMatch) {
        const sVal = sSeriesMatch[1];
        // S系列 → PN 映射
        if (sVal === '5') return 'pn10';
        if (sVal === '4') return 'pn12.5';
        if (sVal === '3.2') return 'pn16';
        if (sVal === '2.5') return 'pn20';
        if (sVal === '2') return 'pn25';
    }
    
    return null;
}

// 规范化文本（处理括号、空格等）
function normalizeText(text) {
    if (!text) return '';
    return text.toLowerCase()
        .replace(/[（(]/g, ' ')
        .replace(/[）)]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// 从产品名称提取主要规格尺寸（用于硬性匹配）
function extractProductPrimarySize(name) {
    if (!name) return null;
    const lower = name.toLowerCase();
    // 【v36.77新增】引号归一化（产品名也可能含弯引号）
    const lowerNorm = lower.replace(/[\u201c\u201d\u2033\u301e]/g, '"');
    
    // 1. 匹配 dn+数字 格式
    const dnMatch = lower.match(/(?:^|[\s\(])d[nne]\s*(\d{1,3})(?:[^\d]|$)/);
    if (dnMatch) {
        // 检查是否是异径规格
        const reducerMatch = lower.match(/d[nne]\s*(\d{1,3})\s*[x\*]\s*(\d{1,3})/i);
        if (reducerMatch) {
            return { primary: parseInt(reducerMatch[1]), secondary: parseInt(reducerMatch[2]), isReducer: true };
        }
        return { primary: parseInt(dnMatch[1]), isReducer: false };
    }
    
    // 2. 匹配 Φ/φ/Ø/∅ + 数字 【v36.18d】扩展支持空集符号 ∅ U+2205
    const phiMatch = lower.match(/[\u03a6\u03c6\u00d8\u2205](\d{1,3})(?:[^\d]|$)/);
    if (phiMatch) {
        return { primary: parseInt(phiMatch[1]), isReducer: false };
    }
    
    // 【v36.5新增】3. 匹配裸英寸规格（如 5/8"、1/2"、3/4"）并转换为对应DN
    // 电线管产品常用英寸标注（如 "PVC电线管 5/8"）
    const inchMatch = lower.match(/(\d+(?:-\d+)?\/\d+)\s*"/);
    if (inchMatch) {
        const inch = inchMatch[1] + '"';
        const mapped = SIZE_MAPPINGS[inch];
        if (mapped) {
            const dnValue = parseInt(mapped[0].replace(/dn/i, ''));
            return { primary: dnValue, isReducer: false, originalUnit: inch };
        }
    }
    
    // 4. 匹配裸数字异径规格（无DN前缀）：如 110*50三通、160*110大小头
    // 格式：数字*数字 + 管件类型词
    // 【v36.86新增】排除角度数字被误识别为异径小端（如 110*45度弯头）
    const bareReducerMatch = lower.match(/(\d{2,4})\s*[x\*×]\s*(\d{2,4})/);
    if (bareReducerMatch) {
        // 检查小端数字后面是否紧跟角度关键词（45度、90°、22.5度等）
        const afterSmall = lower.substring(bareReducerMatch.index + bareReducerMatch[0].length);
        const isAngle = /^\s*[度°]/.test(afterSmall);
        if (!isAngle) {
            // 不是角度数字，当作异径处理
            const large = parseInt(bareReducerMatch[1]);
            const small = parseInt(bareReducerMatch[2]);
            // 确保是合理的管件规格（排除纯数字编码等干扰）
            if (large >= 10 && small >= 10 && large <= 500 && small <= 500) {
                // 大端在前，小端在后；如果反了也自动处理
                const primary = Math.max(large, small);
                const secondary = Math.min(large, small);
                // 如果两端相等（如50*50），当作单尺寸等径产品
                if (primary === secondary) {
                    return { primary: primary, isReducer: false };
                }
                return { primary: primary, secondary: secondary, isReducer: true };
            }
        }
        // 小端数字是角度（45度/90°等），不当作异径处理，跳过
    }
    
    // 5. 匹配合法范围内的裸数字单尺寸（如 "50弯头" 中的50）
    // 仅当数字后面紧跟管件类型关键词时才提取，避免误匹配编码
    const fittingKeywords = ['三通', '顺水三通', '弯头', '直通', '套筒', '管帽', '管堵', '四通', '大小头', '异径', '接头', '法兰', '阀门', '管子', '水管', '电线管', '线管', '管箍', '接箍', '接古', '管', '管卡', 'U型管夹'];
    for (const kw of fittingKeywords) {
        const singleSizeMatch = lower.match(new RegExp(`(\\d{2,3})${kw}`));
        if (singleSizeMatch) {
            const size = parseInt(singleSizeMatch[1]);
            if (size >= 10 && size <= 500) {
                return { primary: size, isReducer: false };
            }
        }
    }
    
    // 【v36.32新增】6. 匹配 "数字x数字" 格式（如 65x40、86x86）
    // 这是接线盒、开关盒等电工产品的长×宽尺寸标注
    const boxSizeMatch = lower.match(/(\d{2,3})\s*x\s*(\d{2,3})/);
    if (boxSizeMatch) {
        const w = parseInt(boxSizeMatch[1]);
        const h = parseInt(boxSizeMatch[2]);
        if (w >= 50 && h >= 50 && w <= 200 && h <= 200) {
            // 返回 wxh 格式，与查询端的 86*86 格式对应
            return { primary: `${w}x${h}`, isBoxSize: true };
        }
    }
    
    return null;
}

// 检查两个尺寸是否兼容（考虑近似值）
// 【v36.2新增】strictMode 参数：
//   - 默认宽松模式：允许外径↔DN近似（如 φ75≈DN65），适用于单尺寸查询
//   - strictMode=true：仅允许精确匹配+紧邻近似（如 63≈65），用于异径双端匹配
//   原因：异径产品中 dn65 和 dn75 是不同英寸规格（2-1/2" vs 3"），不应混为一谈！
// 【v36.32新增】支持 wxh 格式（如 86x86）的接线盒尺寸精确匹配
function isSizeCompatible(querySizeNum, productSizeNum, strictMode = false) {
    // 【v36.32】如果是 wxh 格式（如 "86x86"），进行字符串精确匹配
    if (typeof querySizeNum === 'string' && querySizeNum.includes('x')) {
        return querySizeNum === productSizeNum;
    }
    if (typeof productSizeNum === 'string' && productSizeNum.includes('x')) {
        return querySizeNum === productSizeNum;
    }
    
    const q = parseInt(querySizeNum);
    const p = parseInt(productSizeNum);
    if (q === p) return true;
    
    // v33.1: 基于官方 DN|英寸|公称外径 标准对照表 的近似/容错映射
    const approx = { 
        // 标准外径→DN（来自对照表，用户可能用外径搜DN产品）
        '20': '15',   // φ20=4分=DN15
        '25': '20',   // φ25=6分=DN20
        '32': '25',   // φ32=1寸=DN25
        '40': '32',   // φ40=1寸2=DN32
        '50': '40',   // φ50=1寸半=DN40
        '63': '50',   // φ63=2寸=DN50
        '75': '65',   // φ75=2寸半=DN65
        '90': '80',   // φ90=3寸=DN80
        '110': '100', // φ110=4寸=DN100
        '140': '125', // φ140=5寸=DN125
        '160': '150', // φ160=6寸=DN150
        '219': '200', // φ219=8寸=DN200
        '273': '250', // φ273=10寸=DN250
        '325': '300', // φ325=12寸=DN300
        
        // 反向：DN→常见外径
        '15': '20',
        // 【v36.40删除】'65': '75' 映射导致 65 错误匹配到 75
        // DN65(2-1/2") 和 DN75(3") 是完全不同的英寸规格，不应混为一谈
        // '65': '75',  // DN65 ≈ φ75 —— 已删除！
        '80': '90',  // DN80 ≈ φ90
        '125': '140',// DN125 ≈ φ140
        
        // PPR 管系列近似
        '16': '15',
        '21': '20',
        '26': '25',
        '34': '32',
        '42': '40',
        '48': '40',
        '60': '50',
        
        // 传统紧邻近似（保留兼容）
        '35': '32',
        '22': '20',
        
        // 【v36.39新增】65↔63 近似映射（PPR三通常见规格）
        '65': '63',
        '63': '65',
    };
    
    // 【v36.2】严格模式：仅允许紧邻近似（同一物理规格的不同命名方式）
    // 排除跨英寸边界的宽泛匹配（如 65↔75 在异径场景下是 2-1/2" vs 3"，完全不同！）
    // 【v36.18c新增】Φ/Ø外径查询时使用最严格模式：只接受精确匹配
    // 【v36.57修正】严格模式下也允许 65↔63 近似映射（同一物理规格的不同命名方式）
    if (strictMode) {
        // 严格模式下允许精确匹配和 65↔63 近似映射
        if (q === p) return true;
        // 65↔63 是同一物理规格的不同命名方式（2" = DN50 = φ63 ≈ 65）
        if ((q === 65 && p === 63) || (q === 63 && p === 65)) return true;
        return false;
    }
    
    // 宽松模式（默认）：双向检查所有近似映射
    if (String(q) === String(approx[p])) return true;
    if (String(p) === String(approx[q])) return true;
    
    return false;
}

// 计算匹配分数（重写：加入尺寸硬性过滤 + 尺寸优先级强化）
// 【v36.14优化版】使用预计算缓存，减少重复计算
function calculateMatchScore(product, query) {
    // 【v36.6新增】黑名单检查 - 被禁用的产品直接返回0分
    if (product.material_code && PRODUCT_BLACKLIST.has(product.material_code)) {
        return 0;
    }

    let score = 0;
    const queryLower = query.toLowerCase();

    // 【v36.91新增】软管 = 无货 — 库内无软管类产品，直接返回0（参见 wanding_business_knowledge §4.2）
    if (queryLower.includes('软管')) {
        return 0;
    }

    // 【v36.91新增】RUCIKA 品牌双向隔离（参见 wanding-matching-architecture §6.1）
    // 含 RUCIKA 的查询只匹配 RUCIKA 产品；不含 RUCIKA 的查询排除 RUCIKA 产品
    {
        const _pname = product._cache?.combinedName || ((product.name_cn || '') + ' ' + (product.name_en || '')).toLowerCase();
        const isRucikaQuery = queryLower.includes('rucika');
        const isRucikaProduct = product.sheet === 'RUCIKA' || _pname.includes('rucika');
        if (isRucikaQuery && !isRucikaProduct) return 0;
        if (!isRucikaQuery && isRucikaProduct) return 0;
    }

    // 【v36.91新增】CEILING 产品线双向隔离（参见 wanding-matching-architecture §6.1）
    // CEILING 触发词：ceiling、main hollow、stelldrat、steel drat、soldays、dynabolt、mur soldays
    {
        const CEILING_TRIGGERS = ['ceiling', 'main hollow', 'stelldrat', 'steel drat', 'soldays', 'dynabolt', 'mur soldays'];
        const isCeilingQuery = CEILING_TRIGGERS.some(t => queryLower.includes(t));
        const _pname2 = product._cache?.combinedName || ((product.name_cn || '') + ' ' + (product.name_en || '')).toLowerCase();
        const isCeilingProduct = product.sheet === 'CEILING' || _pname2.includes('ceiling') || _pname2.includes('main hollow') || _pname2.includes('stelldrat') || _pname2.includes('dynabolt');
        if (isCeilingQuery && !isCeilingProduct) return 0;
        if (!isCeilingQuery && isCeilingProduct) return 0;
    }
    const queryNormalized = normalizeText(query);
    
    // 提取查询特征（这些每次查询只需计算一次，在searchSingleKeyword中缓存）
    const querySize = extractSize(query);
    const queryReducerSize = extractReducerSize(query);
    const queryMaterial = extractMaterial(query);
    const queryUsage = extractUsage(query);
    const queryColor = extractColor(query);
    const queryPressure = extractPressure(query);
    // 【v36.44新增】提取连接方式（PE产品）
    const queryConnection = extractConnectionType(query);
    // 【v36.56新增】提取长度单位（如 6米/根、4M/根）
    const queryLength = extractLengthFromQuery(query);
    
    // 【v36.14优化】使用预计算缓存的产品特征
    const cache = product._cache || {};
    const combinedName = cache.combinedName || ((product.name_cn || '') + ' ' + (product.name_en || '')).toLowerCase();
    const normalizedName = cache.normalizedName || normalizeText(combinedName);
    const productSizeInfo = cache.sizeInfo || extractProductPrimarySize(combinedName);
    
    // 使用缓存的布尔标志（避免重复正则测试）
    const isProductTee = cache.isTee !== undefined ? cache.isTee : REGEX_CACHE.teePattern.test(combinedName);
    const isProductElbow = cache.isElbow !== undefined ? cache.isElbow : REGEX_CACHE.elbowPattern.test(combinedName);
    const isProductReducer = cache.isReducer !== undefined ? cache.isReducer : REGEX_CACHE.reducerPattern.test(combinedName);
    const isProductCoupling = cache.isCoupling !== undefined ? cache.isCoupling : REGEX_CACHE.couplingPattern.test(combinedName);
    const isProductThreadedElbow = cache.isThreadedElbow !== undefined ? cache.isThreadedElbow : /内螺纹弯头|外螺纹弯头|Female Thread Elbow|Male Thread Elbow/i.test(combinedName);
    const isProductConduit = cache.isConduit !== undefined ? cache.isConduit : REGEX_CACHE.conduitPattern.test(combinedName);
    const isProductWaterPipe = cache.isWaterPipe !== undefined ? cache.isWaterPipe : (REGEX_CACHE.waterPattern.test(combinedName) || REGEX_CACHE.drainPattern.test(combinedName));
    const productMaterial = cache.material || (REGEX_CACHE.pvcPattern.test(combinedName) ? 'pvc' : REGEX_CACHE.pprPattern.test(combinedName) ? 'ppr' : REGEX_CACHE.pePattern.test(combinedName) ? 'pe' : null);
    
    let sizeMatchType = 0; // 0=无/不匹配, 1=小端匹配, 2=大端/精确匹配
    
    // ===== 【v34新增】管件类型硬性过滤 =====
    // 规则1：大小头只匹配异径套/大小头，不匹配三通
    // 规则2：斜三通只匹配Y Branch，不匹配顺水三通(Large Radius Tee)
    // 规则3：查询指定角度时(90°)，不匹配不同角度产品(45°)
    // 【v35新增】规则4：正三通/三通查询，不匹配弯头
    // 【v35新增】规则5：外丝接头/外螺纹接头查询，不匹配弯头
    
    // 检测查询中的关键类型词
    const hasQueryDaxiaotou = /(大小头|异径套|异径接头|异径管|变径直接|变径接头|变径直通|变径|reducer|\bRS\b|\bRD\b)/i.test(query);
    const hasQueryXiesantong = /斜三通/i.test(query);
    const hasQueryShunsanitong = /顺水?三通|正三通|等径三通/i.test(query);
    const hasQueryWanTou = /弯头/i.test(query);
    
    // 【v35新增】检测三通和外丝接头查询
    const hasQuerySantong = /正三通|等径三通|斜三通|三通(?:\s|$)|\btee\b|\bET\b|\bRT\b/i.test(query);
    const hasQueryWaitou = /外丝接头|外螺纹接头|外丝直接头|外螺纹直接|外丝直接/i.test(query);
    
    // 提取查询中指定的角度（90°/45°/22.5°）
    let queryAngle = null;
    if (/90[°度]|90度|正弯头|90弯头/i.test(query)) {
        queryAngle = '90';
    } else if (/45[°度]|45度|斜弯头|45弯头/i.test(query)) {
        queryAngle = '45';
    } else if (/22\.5[°度]|22\.5度|11\.25[°度]|11\.25度/i.test(query)) {
        queryAngle = '22.5';
    }
    
    // 规则1：大小头/异径管不能匹配到三通类产品，也不能匹配到弯头！
    // 【v36扩展】异径产品查询 → 同时排除三通和弯头（这是两种完全不同的管件类型）
    if (hasQueryDaxiaotou) {
        if ((isProductTee || /branch/i.test(combinedName)) && !isProductReducer) {
            return 0; // 大小头查询 → 排除三通/branch类产品
        }
        // 【v36新增】异径查询 → 也排除弯头！
        if (isProductElbow && !isProductReducer) {
            return 0; // 大小头/异径管查询 → 排除弯头类产品
        }
    }
    
    // 【v36.53新增】规则1.5：异径三通查询 → 只匹配三通产品，排除异径套/大小头
    // "异径三通"中的"异径"是修饰"三通"的，不是"异径套"
    const hasQueryYijingSantong = /异径三通/i.test(query);
    if (hasQueryYijingSantong) {
        if (!isProductTee) {
            return 0; // 异径三通查询 → 排除非三通产品（如异径套、大小头等）
        }
    }
    
    // 规则2：斜三通只能匹配 Y Branch（45°分支），不匹配 Large Radius Tee（顺水三通）
    if (hasQueryXiesantong) {
        const isLargeRadiusTee = /顺水?三通|large\s*radius\s*tee/i.test(combinedName);
        const isYBranch = /y\s*branch|45.*分支|斜三通|异径斜/i.test(combinedName);
        if (isLargeRadiusTee && !isYBranch) {
            return 0; // 斜三通查询 → 排除顺水三通
        }
    }
    
    // 规则3：角度精确匹配 — 查询指定角度时排除不同角度的产品
    // 【v36.42修复】查询90°时，排除所有非90°的角度（包括22.5°、45°等）
    // 【v36.89修正】查询90°时，产品没有90°标识（如无角度的管材/盘管）也必须排除！
    if (queryAngle === '90') {
        // 查询90°：产品必须包含90°标识
        const productHas90 = /90[°度]|90度|90°|正弯头/i.test(combinedName);
        if (!productHas90) {
            return 0; // 查询90°，产品没有90°标识 → 排除（包括无角度的管材、盘管等）
        }
    } else if (queryAngle === '45') {
        // 查询45°：排除90°产品
        const productHas90 = /90[°度]|90度|90°|正弯头/i.test(combinedName);
        if (productHas90) {
            return 0; // 角度不匹配，直接排除！
        }
    } else if (queryAngle === '22.5') {
        // 查询22.5°：排除90°和45°产品
        const productHasOtherAngle = /90[°度]|90度|90°|正弯头|45[°度]|45度|45°|斜弯头/i.test(combinedName);
        if (productHasOtherAngle) {
            return 0; // 角度不匹配，直接排除！
        }
    }
    
    // 【v36.84新增】规则3.5：弯头默认90° — 查询只说"弯头"时排除22.5°和45°弯头
    // "弯头"不设角度时 = 默认90°，22.5°/45°弯头不应匹配
    const queryHasElbowNoAngle = /弯头|elbow/i.test(query) && !queryAngle;
    if (queryHasElbowNoAngle) {
        const productHasNon90Angle = /22\.5[°度]?|11\.25[°度]?|45[°度]?|斜弯头/i.test(combinedName);
        if (productHasNon90Angle) {
            return 0; // 弯头默认90°，排除非90°角度产品
        }
    }

    // 【v35新增】规则4：正三通/等径三通/斜三通查询 → 排除弯头产品
    // 正三通不能匹配到45°弯头！这是最严重的交叉匹配错误
    if (hasQuerySantong) {
        if (isProductElbow && !isProductTee) {
            return 0; // 三通查询 → 排除弯头类产品
        }
        // 【v36.72新增】三通查询 → 排除非三通的接头/直通/直接头产品
        // 例：查"内丝三通DN20"不应匹配到"内螺纹直接头"
        if (!isProductTee && /接头|直通|直接头|coupling|socket|adapter/i.test(combinedName)) {
            return 0; // 三通查询 → 排除非三通的接头类产品
        }
    }
    
    // 【v35新增】规则5：外丝接头/外螺纹接头查询 → 排除非外螺纹产品
    // 【v36.49修复】"外丝"匹配"外螺纹"或"外丝"，但不能匹配"螺纹堵头"（堵头不是接头）
    if (hasQueryWaitou) {
        // 必须包含"外丝"或"外螺纹"
        const hasWaiSi = /外丝|外螺纹/i.test(combinedName);
        // 或者包含"male thread"但不是"plug"（堵头）
        const hasMaleThreadNotPlug = /male\s*thread/i.test(combinedName) && !/plug|堵头/i.test(combinedName);
        
        if (!hasWaiSi && !hasMaleThreadNotPlug) {
            return 0; // 外丝接头查询 → 排除所有非外螺纹接头产品
        }
    }
    
    // 【v36.23d新增】规则5.9：内丝/内螺纹查询 → 排除非内螺纹产品
    // 【v36.49修复】"内丝"必须匹配"内螺纹"或"内丝"，不能匹配普通的"螺纹"（如螺纹堵头）
    const hasQueryNeiSi = /内丝|内螺纹|female\s*thread/i.test(query);
    if (hasQueryNeiSi) {
        // 必须包含"内丝"或"内螺纹"或"female thread"，单纯的"螺纹"不算
        const isProductNeiSi = /内丝|内螺纹|female\s*thread/i.test(combinedName);
        if (!isProductNeiSi) {
            return 0; // 内丝查询 → 排除所有非内螺纹产品
        }
    }
    
    // 【v36.23d新增】规则5.10：通用接头查询 → 排除弯头产品
    // "接头"不能匹配到"弯头"！这是两个完全不同的管件类型
    const hasQueryJieTou = /接头/i.test(query);
    if (hasQueryJieTou) {
        if (isProductElbow) {
            return 0; // 任何接头查询 → 排除所有弯头类产品
        }
    }
    
    // 【v36.9新增】规则5.4：弯头查询 → 排除三通产品（Rule 4的反向）
    // "内丝弯头"不能匹配到"等径三通"！
    const hasQueryWanTouStrict = /弯头|elbow|\bE\b(?!\w)/i.test(query);
    if (hasQueryWanTouStrict) {
        if (isProductTee && !isProductElbow) {
            return 0; // 弯头查询 → 排除三通类产品
        }
        // 【v36.82新增】弯头查询 → 排除球阀/阀门产品
        // "90°等径弯头"不能匹配到"PVC球阀"！
        const isProductValve = /球阀|闸阀|蝶阀|止回阀|截止阀|调节阀|阀门|valve/i.test(combinedName);
        if (isProductValve) {
            return 0; // 弯头查询 → 排除所有阀门类产品
        }
    }
    
    // 【v36.23c新增】规则5.8：保温材料/保温棉查询 → 排除所有管件产品
    // "防紫外线保温棉"不能匹配到球阀或管道！
    const hasQueryBaowen = /保温棉|保温材料|保温套/i.test(query);
    if (hasQueryBaowen) {
        // 检查产品是否是保温材料
        const isProductBaowen = /保温|隔热|橡塑|岩棉|玻璃棉/i.test(combinedName);
        if (!isProductBaowen) {
            return 0; // 保温材料查询 → 排除非保温类产品
        }
    }
    
    // 【v36.88新增】规则5.8.1：管卡/U型管夹查询 → 排除非管卡产品
    // "排水管 分两片管卡"不能匹配到弯头！找不到就写无货
    const hasQueryGuanka = /管卡|U型管夹|管夹|分两片/i.test(query);
    if (hasQueryGuanka) {
        const isProductGuanka = /管卡|管夹|U型|分两片/i.test(combinedName);
        if (!isProductGuanka) {
            return 0; // 管卡查询 → 排除非管卡产品
        }
    }
    
    // 【v36.23e新增】规则5.11：异径/大小头/变径查询 → 排除非异径产品
    // "变径 DN32 变 25"不能匹配到球阀！
    const hasQueryYijing = /异径|大小头|变径/i.test(query);
    if (hasQueryYijing) {
        // 检查产品是否是异径产品（使用缓存或实时检测）
        const isProductYijing = cache.isReducer !== undefined 
            ? cache.isReducer 
            : REGEX_CACHE.reducerPattern.test(combinedName);
        if (!isProductYijing) {
            return 0; // 异径查询 → 排除非异径产品
        }
    }
    
    // 【v36.23e新增】规则5.12：伸缩节查询 → 排除非伸缩节产品
    // "伸缩节 DN32"不能匹配到球阀！
    const hasQueryShensuo = /伸缩节|补偿器|膨胀节/i.test(query);
    if (hasQueryShensuo) {
        const isProductShensuo = /伸缩节|补偿器|膨胀节|expansion/i.test(combinedName);
        if (!isProductShensuo) {
            return 0; // 伸缩节查询 → 排除非伸缩节产品
        }
    }

    // 【v36.74新增】规则5.13：堵头/管帽/丝堵/管塞查询 → 排除非堵头产品
    // "外丝堵头 4分"不能匹配到弯头！找不到精确匹配就返回"无货"
    const hasQueryDutou = /堵头|管帽|丝堵|管塞|plug|cap/i.test(query)
        && !/(弯头|elbow|三通|tee|直通|直接|coupling|接头|法兰|flange|阀门|valve)/i.test(query);
    if (hasQueryDutou) {
        // PPR上下文：堵头=螺纹堵头
        const isPprDutouCtx = /ppr|pp-r/i.test(query);
        const isProductDutou = isPprDutouCtx
            ? /螺纹堵头|螺纹管塞|threaded\s*plug|threaded\s*end\s*plug|外螺纹.*堵|内螺纹.*堵|male.*plug|female.*plug/i.test(combinedName)
            : /管帽|堵头|丝堵|管塞|end\s*cap|pipe\s*cap|plug|cap/i.test(combinedName);
        // 弯头、三通、直通等绝对不是堵头
        const isNonDutouFitting = /弯头|elbow|三通|tee|直通|直接|coupling|法兰|flange|阀门|valve/i.test(combinedName);
        if (isNonDutouFitting || !isProductDutou) {
            return 0; // 堵头查询 → 排除非堵头产品（特别是弯头！）
        }
    }

    // 【v36.9新增】规则5.7：内丝/外丝弯头查询 → 排除非螺纹弯头
    // 【v36.45修复】支持"弯头内丝"和"内丝弯头"两种顺序
    // 查询明确指定"内丝/外丝弯头"时，非螺纹弯头产品直接排除
    const hasQueryNeiSiWanTouStrict = /内丝.*弯头|内螺纹.*弯头|弯头.*内丝|弯头.*内螺纹/i.test(query);
    const hasQueryWaiSiWanTouStrict = /外丝.*弯头|外螺纹.*弯头|弯头.*外丝|弯头.*外螺纹/i.test(query);
    if (hasQueryNeiSiWanTouStrict || hasQueryWaiSiWanTouStrict) {
        // 是弯头但不是螺纹弯头 → 排除
        if (isProductElbow && !isProductThreadedElbow) {
            return 0; // 内丝/外丝弯头查询 → 排除普通弯头
        }
    }
    
    // 【v36.7新增】规则5.5：接线盒通数类型查询 → 排除三通产品
    // 单通/双通/角通/四通都是接线盒的通数类型，不是管件三通
    const hasQueryJunctionBoxType = /单通|双通|角通|四通/i.test(query);
    if (hasQueryJunctionBoxType) {
        const isProductJunctionBox = /接线盒|线盒|开关盒|底盒|八角盒|junction\s*box/i.test(combinedName);
        // 如果查询是接线盒通数类型，但产品是三通且不是接线盒，则排除
        if (isProductTee && !isProductJunctionBox) {
            return 0; // 单通/双通/角通/四通查询 → 排除三通类产品
        }
    }
    
    // 【v36.9新增】规则5.6：直通/直接（配件）查询排除非直通产品
    // 例：搜"PPR直接"（直通配件），不应匹配到"PPR热给水直管"（管材）
    // 【v36.54修正】查询"直接"时，只匹配直通/直接类产品，排除水龙头等其他产品
    const hasQueryZhitong = /直通|直接/i.test(query);
    if (hasQueryZhitong) {
        // 必须是直通/直接/接头类产品，不能是水龙头、阀门等其他产品
        const isProductCouplingOrSocket = /直通|直接|接头|coupling|socket|adapter/i.test(combinedName);
        const isProductFaucetOrValve = /水龙头|faucet|阀门|valve/i.test(combinedName);
        
        // 查询是直通/直接，但产品不是直通类 → 排除
        if (!isProductCouplingOrSocket || isProductFaucetOrValve) {
            return 0; // 直通/直接查询 → 排除非直通类产品（包括水龙头、阀门等）
        }
    }

    // 【v36.78g新增】规则5.6.5：弯头/三通/直节等管件查询 → 排除直管/管材产品
    // 例：搜"PPR弯头"不应匹配到"PPR热给水直管"
    const hasQueryFitting = /弯头|elbow|三通|tee|直节|\bET\b|\bRT\b|\bFTE\b|\bMTE\b/i.test(query);
    if (hasQueryFitting) {
        // 检查产品是否是直管/管材（不是管件）
        const isProductPipe = /直管|给水管|排水管|管材|pipe\s*\w*\s*\d+m/i.test(combinedName)
            && !/弯头|elbow|三通|tee|直通|直接|接头|管帽|堵头|法兰|阀门/i.test(combinedName);
        if (isProductPipe) {
            return 0; // 管件查询 → 排除直管/管材产品
        }
    }

    // 【v36.83新增】规则5.6.6：阀门/截止阀/球阀查询 → 排除非阀门产品（管材、三通、弯头等）
    // 例：搜"PPR截止阀 1/2""不应匹配到"PPR冷给水直管"
    const hasQueryValve = /截止阀|球阀|闸阀|蝶阀|止回阀|调节阀|阀门|\bvalve\b/i.test(query);
    if (hasQueryValve) {
        // 检查产品是否是阀门类
        const isProductValveType = /截止阀|球阀|闸阀|蝶阀|止回阀|调节阀|阀门|valve/i.test(combinedName);
        if (!isProductValveType) {
            return 0; // 阀门查询 → 排除非阀门产品
        }
    }

    // 【v36.91新增】规则5.6.9：三角阀 ≠ 角阀（参见 wanding_business_knowledge §4.1）
    // 库内仅有角阀；查询"三角阀"时排除所有角阀候选，返回无货
    if (query.includes('三角阀')) {
        const isProductJiaoFa = combinedName.includes('角阀');
        const isProductSanjiao = combinedName.includes('三角阀') || combinedName.includes('三角');
        if (isProductJiaoFa && !isProductSanjiao) {
            return 0; // 三角阀查询 → 角阀不是三角阀，排除
        }
    }

    // 【v36.89c新增】规则5.6.7：管材/水龙头双向隔离
    // "Pipa PVC AW"（管材）不能匹配到水龙头；查询水龙头也不能匹配到管材
    const hasQueryPipe = /管|pipa|pipe|管材|给水管|排水管/i.test(query) 
        && !/水龙头|faucet/i.test(query);
    if (hasQueryPipe) {
        const isProductFaucet = /水龙头|faucet/i.test(combinedName);
        if (isProductFaucet) {
            return 0; // 管材查询 → 排除水龙头
        }
    }
    
    const hasQueryFaucet = /水龙头|faucet/i.test(query);
    if (hasQueryFaucet) {
        // 查询水龙头时，排除纯管材（不含管件配件词的管材）
        const isProductPipeOnly = /直管|给水管|排水管|管材|pipe\s*\w*\s*\d+m/i.test(combinedName)
            && !/弯头|elbow|三通|tee|直通|直接|接头|管帽|堵头|法兰|阀门|水龙头|faucet/i.test(combinedName);
        if (isProductPipeOnly) {
            return 0; // 水龙头查询 → 排除纯管材产品
        }
    }

    // 【v36.90新增】规则5.6.8：给水/排水系列隔离
    // 查询明确"给水" → 排除D排水系列产品；查询明确"排水" → 排除AW给水系列产品
    const hasQueryGeishui = /给水/i.test(query);
    const hasQueryPaishui = /排水/i.test(query);
    if (hasQueryGeishui && !hasQueryPaishui) {
        // 查询给水：排除D排水系列产品
        if (/D排水|排水系列/i.test(combinedName)) {
            return 0;
        }
    }
    if (hasQueryPaishui && !hasQueryGeishui) {
        // 查询排水：排除AW给水系列产品
        if (/AW给水|给水系列/i.test(combinedName)) {
            return 0;
        }
    }

    // 【v35.3新增】规则6：单尺寸查询不匹配异径产品
    // 例：搜"DN50三通"(只有一个尺寸)，不应匹配到 DN100*50 异径三通
    // 只有明确写了异径格式(110*50)的查询才能匹配异径产品
    // 【v36.9修正】例外：螺纹弯头/螺纹直接头是特殊的异径产品，单尺寸查询时应该允许匹配
    // 【v36.50修正】外螺纹直接头（Male Thread Adapter）也是异径产品，但应该允许单尺寸查询
    const isProductThreadedAdapter = /外螺纹直接头|内螺纹直接头|male\s*thread\s*adapter|female\s*thread\s*adapter/i.test(combinedName);
    if (querySize && !queryReducerSize && productSizeInfo && productSizeInfo.isReducer && !isProductThreadedElbow && !isProductThreadedAdapter) {
        return 0; // 单尺寸查询 → 排除异径产品（螺纹弯头和螺纹直接头除外）
    }
    
    // 【v36新增】规则7：材料类型硬性过滤（绝对不能交叉！）
    // PPR产品永远不能匹配到PVC产品，反之亦然
    // 这是用户反复强调的"绝对不允许"的规则！
    if (queryMaterial) {
        const queryMat = queryMaterial.toLowerCase();
        // 【v36.92】RUCIKA 产品= PVC-U（AW系列），名称不含"pvc"但材料是PVC
        const productHasMaterial = combinedName.includes(queryMat) || 
            (product.sheet === 'RUCIKA' && queryMat === 'pvc');
        
        // 查询指定了具体材料类型，但产品不含该材料 → 直接排除
        if (!productHasMaterial) {
            // 特殊处理：UPVC 查询应该也能匹配到 PVC 产品（因为 UPVC 是 PVC 的一种）
            if (queryMat === 'pvc' && /upvc/i.test(queryLower)) {
                // UPVC 查询：允许匹配含 "upvc" 或 "pvc" 的产品
                if (!/upvc|pvc/i.test(combinedName)) {
                    return 0;
                }
            } else {
                // 其他情况：材料不匹配直接排除
                return 0;
            }
        }
    }
    
    // 【v36.2新增】规则8：用途分类硬性过滤（电线 vs 水管，绝对不能交叉！）
    // 查询八角盒/线管/底盒等电气产品 → 绝对不能匹配到给水管件或排水管件
    // 【v36.18修复】查询线管时，只匹配电气类产品（排除所有非电气产品）
    if (queryUsage) {
        if (queryUsage === 'conduit' && !isProductConduit) {
            return 0; // 电线产品查询 → 只匹配电气类产品！
        }
        // 反向：水管查询排除纯电气产品
        if ((queryUsage === 'water' || queryUsage === 'drain') && isProductConduit) {
            return 0;
        }
    }
    
    // 【v36.21新增】规则9：压强(PN/MPa)硬性过滤
    // 查询指定PN值时，必须匹配对应的压强，不能匹配其他压强等级
    // 【v36.84修正】只对"有明确压力标注"的产品进行PN过滤；无压力标注的产品不排除
    if (queryPressure) {
        const pnInfo = PN_MAPPING[queryPressure.toLowerCase()];
        if (pnInfo) {
            // 检查产品是否有任何压力标注（任一PN等级的pattern）
            const hasAnyPressureInfo = Object.values(PN_MAPPING).some(info =>
                info.patterns.some(p => combinedName.toLowerCase().includes(p.toLowerCase()))
            );
            if (hasAnyPressureInfo) {
                // 产品有明确压力标注 → 必须匹配查询的PN
                let hasMatchingPressure = false;
                for (const pattern of pnInfo.patterns) {
                    if (combinedName.toLowerCase().includes(pattern.toLowerCase())) {
                        hasMatchingPressure = true;
                        break;
                    }
                }
                if (!hasMatchingPressure) {
                    return 0; // 压强不匹配，排除
                }
            }
            // 产品没有压力标注 → 跳过PN过滤（不排除）
        }
    }
    
    // 【v36.28新增 / v36.29修正】规则10：热水/冷水硬性过滤
    // PPR热水管不能匹配到冷水管，反之亦然
    // 注意：「热给水」也属于热水产品，「冷给水」也属于冷水产品
    const queryHasHotWater = /热水/i.test(query);
    const queryHasColdWater = /冷水/i.test(query);
    if (queryHasHotWater) {
        // 查询热水：产品含"冷水/冷给水"但不含"热水/热给水"的直接排除
        const productHasCold = /冷水|冷给水/i.test(combinedName);
        const productHasHot = /热水|热给水/i.test(combinedName);
        if (productHasCold && !productHasHot) {
            return 0; // 热水查询 → 排除纯冷水产品
        }
    }
    if (queryHasColdWater) {
        // 查询冷水：产品含"热水/热给水"但不含"冷水/冷给水"的直接排除
        const productHasHot = /热水|热给水/i.test(combinedName);
        const productHasCold = /冷水|冷给水/i.test(combinedName);
        if (productHasHot && !productHasCold) {
            return 0; // 冷水查询 → 排除纯热水产品
        }
    }
    
    // 【v36.56新增】规则11：长度单位硬性过滤 + 【v36.68】6M/根优先选择
    // 查询指定长度（如6米/根）时，必须匹配对应长度的产品
    // 例：查询"PE给水管 DN100, 6米/根"，不应匹配到 4M/根 的产品
    if (queryLength) {
        // 从产品名称中提取长度
        const productLengthMatch = combinedName.match(/(\d+(?:\.\d+)?)\s*m\/(根|pcs)/i);
        if (productLengthMatch) {
            const productLength = parseFloat(productLengthMatch[1]);
            // 长度不匹配（允许0.5的误差，如5.8M≈6M）
            if (Math.abs(productLength - queryLength.value) > 0.5) {
                return 0; // 长度不匹配，直接排除！
            }
            // 【v36.68】长度近似匹配时，优先选择整数标准长度（6M > 5.8M）
            // 当查询是整数长度（如6M），且产品是非整数（如5.8M），降权处理
            if (Number.isInteger(queryLength.value) && !Number.isInteger(productLength)) {
                score -= 10; // 近似长度降权，让精确匹配排前面
            } else if (!Number.isInteger(queryLength.value)) {
                score -= 5; // 查询本身是小数时也轻微降权非精确产品
            }
        }
    }
    
    // 【v36.44新增】规则11：PE连接方式过滤（电熔 vs 对接）
    // 【v36.59修正】默认匹配对接产品，电熔需要明确查询才匹配
    // 查询没有指定连接方式时 → 直接排除电熔产品
    // 查询明确指定"电熔/新型电熔"时 → 只匹配电熔产品
    if (queryMaterial === 'pe') {
        const productIsElectrofusion = /新型电熔|电熔|电容|electro[\s\-]?fusion/i.test(combinedName);
        const productIsButtFusion = /对接|butt[\s\-]?fusion/i.test(combinedName) || 
                                   (!productIsElectrofusion); // 没有明确标识电熔的都视为对接
        
        if (!queryConnection) {
            // 查询没有指定连接方式 → 默认排除电熔产品
            if (productIsElectrofusion) {
                return 0; // 默认排除电熔产品，只匹配对接产品
            }
        } else if (queryConnection === 'electrofusion') {
            // 查询明确指定"电熔/新型电熔" → 只匹配电熔产品
            if (!productIsElectrofusion) {
                return 0; // 查询电熔，但产品不是电熔 → 排除
            }
        } else if (queryConnection === 'buttfusion') {
            // 查询明确指定"对接" → 只匹配对接产品
            if (productIsElectrofusion) {
                return 0; // 查询对接，但产品是电熔 → 排除
            }
        }
    }
    
    if (querySize && !queryReducerSize) {
        // 单尺寸查询：如 "63外丝头"、"50正弯头"、"110三通"、"86x86接线盒"
        const querySizeNum = querySize.replace(/dn/i, '');
        
        // 【v36.18c修复】查询包含Φ/Ø前缀时，使用严格匹配（不近似映射）
        // 【v36.18d】扩展支持的字符：ΦφØ∅
        const hasPhiPrefix = /[\u03a6\u03c6\u00d8\u2205]/.test(query);
        
        if (productSizeInfo) {
            // 【v36.32新增】接线盒尺寸（wxh格式）精确匹配
            if (productSizeInfo.isBoxSize || (typeof querySizeNum === 'string' && querySizeNum.includes('x'))) {
                // wxh 格式必须精确匹配（如 86x86 只能匹配 86x86）
                if (querySizeNum === productSizeInfo.primary) {
                    sizeMatchType = 2; // 精确匹配
                } else {
                    return 0; // 尺寸不匹配，直接排除
                }
            } else if (productSizeInfo.isReducer) {
                // 异径产品：查询的单尺寸必须匹配异径的任一端
                const matchesPrimary = isSizeCompatible(querySizeNum, productSizeInfo.primary, hasPhiPrefix);
                const matchesSecondary = isSizeCompatible(querySizeNum, productSizeInfo.secondary, hasPhiPrefix);
                
                if (!matchesPrimary && !matchesSecondary) {
                    return 0; // 两端都不匹配，排除
                }
                // 标记匹配类型：大端(主端)=2分，小端=1分
                if (matchesPrimary) sizeMatchType = 2;
                else if (matchesSecondary) sizeMatchType = 1;
            } else {
                // 非异径产品：主尺寸必须精确匹配
                if (!isSizeCompatible(querySizeNum, productSizeInfo.primary, hasPhiPrefix)) {
                    return 0; // 尺寸不匹配，直接排除！
                }
                sizeMatchType = 2; // 精确匹配
            }
        } else {
            // 产品没有提取到尺寸信息
            // 不直接返回0（避免过度过滤），但也不加分
        }
    }
    
    if (queryReducerSize) {
        if (productSizeInfo) {
            if (productSizeInfo.isReducer) {
                // 【v36.2】异径双端匹配使用严格模式：禁止跨英寸边界近似
                // 例：查询 6"×2-1/2寸(dn150×dn65) 不能匹配到 dn150×dn75(6"×3")！
                const largeMatchPrimary = isSizeCompatible(queryReducerSize.large, productSizeInfo.primary, true);
                const largeMatchSecondary = isSizeCompatible(queryReducerSize.large, productSizeInfo.secondary, true);
                const smallMatchPrimary = isSizeCompatible(queryReducerSize.small, productSizeInfo.primary, true);
                const smallMatchSecondary = isSizeCompatible(queryReducerSize.small, productSizeInfo.secondary, true);
                
                if (!((largeMatchPrimary && smallMatchSecondary) || 
                      (largeMatchSecondary && smallMatchPrimary))) {
                    return 0;
                }
                // 双端都匹配给最高分
                sizeMatchType = 2;
            } else {
                return 0; // 异径查询不能匹配非异径产品
            }
        } else {
            return 0; // 异径查询必须有尺寸信息
        }
        
        // 异径精确匹配给予额外高分奖励
        score += 70; // 【v32】异径规格完全匹配的基础分数提升
    }
    
    // ===== 尺寸优先级加权（v32新增）=====
    // 确保尺寸正确的产品排在前面
    if (sizeMatchType === 2) {
        score += 80; // 大端匹配 / 单尺寸精确匹配 / 双端匹配 — 高权重
    } else if (sizeMatchType === 1) {
        score += 40; // 小端匹配 — 中等权重（仍可接受但优先级低）
    }
    
    // ===== 正常评分逻辑 =====
    
    // 1. 规格匹配加分
    if (queryReducerSize) {
        let reducerMatched = false;
        
        for (const largeVar of queryReducerSize.largeVariants) {
            for (const smallVar of queryReducerSize.smallVariants) {
                const patterns = [
                    `${largeVar}*${smallVar}`,
                    `${largeVar}×${smallVar}`,
                    `${largeVar}x${smallVar}`,
                    `dn${largeVar}x${smallVar}`,
                    `dn${largeVar}×${smallVar}`,
                    `dn${largeVar}*${smallVar}`
                ];
                for (const pattern of patterns) {
                    if (combinedName.includes(pattern)) {
                        score += 60;
                        reducerMatched = true;
                        break;
                    }
                }
                if (reducerMatched) break;
            }
            if (reducerMatched) break;
        }
        
        if (!reducerMatched) {
            for (const largeVar of queryReducerSize.largeVariants) {
                if (combinedName.includes(largeVar) || combinedName.includes(`dn${largeVar}`)) {
                    score += 30;
                    break;
                }
            }
        }
    }
    else if (querySize) {
        const sizeNum = querySize.replace(/dn/i, '');
        const strictPatterns = [
            new RegExp(`(?:^|[\\s(])dn${sizeNum}(?:[\\s)]|$)`,'i'),
            new RegExp(`(?:^|[\\s(])DN${sizeNum}(?:[\\s)]|$)`,'i'),
            new RegExp(`(?:^|[\\s)])${sizeNum}(?:[\\s)]|$)`,'i')
        ];
        
        let strictMatched = false;
        for (const pattern of strictPatterns) {
            if (pattern.test(combinedName)) {
                score += 50;
                strictMatched = true;
                break;
            }
        }
        
        if (!strictMatched) {
            for (const [inch, dns] of Object.entries(SIZE_MAPPINGS)) {
                if (dns.includes(querySize)) {
                    for (const dn of dns) {
                        const dnNum = dn.replace(/dn/i, '');
                        const dnPattern = new RegExp(`(?:^|[\\s(])${dn}(?:[\\s)]|$)`,'i');
                        if (dnPattern.test(combinedName)) {
                            score += 45;
                            strictMatched = true;
                            break;
                        }
                    }
                }
                if (strictMatched) break;
            }
        }
        
        if (strictMatched) score += 40;
    }
    
    // 2. 材料类型匹配
    if (queryMaterial && combinedName.includes(queryMaterial)) {
        score += 20;
    }
    
    // 3. 用途匹配
    if (queryUsage) {
        if (queryUsage === 'water' && (combinedName.includes('给水') || combinedName.includes('water') || combinedName.includes('aw'))) score += 15;
        if (queryUsage === 'drain' && (combinedName.includes('排水') || combinedName.includes('drain') || combinedName.includes('dwv'))) score += 15;
        if (queryUsage === 'conduit' && (combinedName.includes('线管') || combinedName.includes('conduit') || combinedName.includes('电线') || combinedName.includes('电工'))) score += 15;
    }
    
    // 3.1 【v36.28新增 / v36.29修正】热水/冷水加分
    // 查询热水时，热水/热给水产品优先；查询冷水时，冷水/冷给水产品优先
    // 注意：「热给水」也属于热水产品，「热水」关键词要同时匹配「热给水」
    const productHasHotKeyword = /热水|热给水/i.test(combinedName);
    const productHasColdKeyword = /冷水|冷给水/i.test(combinedName);
    if (queryHasHotWater && productHasHotKeyword) {
        score += 25; // 热水/热给水产品 → 大幅加分
    }
    if (queryHasColdWater && productHasColdKeyword) {
        score += 25; // 冷水/冷给水产品 → 大幅加分
    }
    
    // 3.2 【v36.29新增】热水管/冷水管（管材查询）→ 直管优先，过桥弯管降权
    // 「PP-R 热水管」查询的是管材，过桥弯管是配件，不应该排在直管前面
    const queryIsPipeMaterial = /热水管|冷水管|给水管|直管/i.test(query);
    if (queryIsPipeMaterial) {
        if (/直管/i.test(combinedName)) {
            score += 30; // 直管产品大幅加分
        }
        if (/过桥弯管|弯管|配件/i.test(combinedName)) {
            score -= 20; // 过桥弯管/配件降权
        }
    }
    
    // 4. 颜色匹配
    if (queryColor) {
        if (queryColor === 'white' && (combinedName.includes('白色') || combinedName.includes('white'))) score += 10;
        if (queryColor === 'grey' && (combinedName.includes('灰色') || combinedName.includes('grey') || combinedName.includes('gray'))) score += 10;
    }
    
    // 【v35.3新增】4.1 压强(PN/MPa)匹配
    if (queryPressure) {
        const pnInfo = PN_MAPPING[queryPressure.toLowerCase()];
        if (pnInfo) {
            // 用PN映射中的多种模式逐一检查产品名称
            for (const pattern of pnInfo.patterns) {
                if (combinedName.toLowerCase().includes(pattern.toLowerCase())) {
                    score += 30; // 压强精确匹配加分
                    break;
                }
            }
        } else {
            // 没有预定义映射，直接文本搜索（如直接搜"1.25MPa"）
            if (combinedName.toLowerCase().includes(queryPressure.toLowerCase())) {
                score += 20;
            }
        }
    }
    
    // 5. 管件类型匹配
    const queryFitting = extractFittingType(query);
    if (queryFitting) {
        // 【v36.4】管件类型别名映射表（综合华龙+4.20报价单学习）
        const fittingAliasMap = {
            // === 弯头系列 ===
            '90°弯头': ['弯头', '90°弯头', '90度弯头'],
            '45°弯头': ['斜弯头', '45°弯头', '45度弯头', '斜弯'],  // 【v36.11学习SDI报价单】斜弯=45°弯头
            
            // === 斜三通系列 ===
            '45°斜三通': ['斜三通', '45°斜三通', '45度斜三通', '45°三通', '45度三通'],  // 【v36.11学习SDI报价单】【v36.55】45°三通=斜三通
            
            // === 三通系列（关键：上下文区分！）===
            '顺水三通': ['顺水三通', '短型顺水三通', '排水正三通', '短型异径顺水三通'],  // 排水管件
            '90°等径三通': ['等径三通', '正三通', '90°等径三通'],  // PPR/给水默认
            '90°异径三通': ['异径三通'],
            
            // === 【v36.4新增】电工/线管系列 ===
            'PVC电线管': ['PVC电线管', 'PVC线管', 'PVC管', '电工管', '电线管'],
            '管直通': ['管直通', '直通', '直接', '套筒'],
            'U型管夹': ['U型管夹', '管卡', '马鞍管卡', '管夹'],
            '管接头': ['管接头', '锁母', '锁扣', '杯梳'],
            '接线盒': ['接线盒', '圆接线盒', '八角盒', '线盒', '开关盒', '明装开关盒'],
            
            // === 直接/接头 ===
            '直通': ['直通', '直接', '套筒', '管直通'],
            '外螺纹直接头': ['外丝接头', '外螺纹接头'],
            '内螺纹弯头': ['内螺纹弯头', 'Female Thread Elbow', '内丝弯头'],
            '外螺纹弯头': ['外螺纹弯头', 'Male Thread Elbow', '外丝弯头'],
            
            // === 堵头 ===
            '螺纹堵头': ['螺纹堵头', '螺纹管塞', 'threaded plug', 'threaded end plug'],
            
            // === 异径 ===
            '异径套': ['异径套', '大小头', '异径管', '变径', '补芯', '变径直通', '异径直接', '变径直接', '变径接头', '同心异径接头', '变径接头', 'reducing socket', 'reducer', 'RS', 'RD'],  // 【v36.79】补全变径直接/变径接头/RS/RD
            
            // === 【v36.30新增】法兰套系列 ===
            '法兰套': ['法兰套', '法兰根', 'flange', '对接法兰套'],
            
            // === 【v36.66新增】弯管弹簧系列 ===
            '弯管弹簧': ['弯管弹簧', '弯管器', '线管弹簧'],
            
            // === 【v36.14新增】胶水系列 ===
            '胶水': ['胶水', '粘合剂', 'pipe cement', 'glue']
        };
        
        const possibleNames = fittingAliasMap[queryFitting] || [queryFitting];
        let typeMatched = false;
        for (const name of possibleNames) {
            if (normalizedName.includes(name)) {
                score += 30;
                typeMatched = true;
                break;
            }
        }
        // 三通/弯头的通用匹配（兜底）
        if (!typeMatched) {
            if (normalizedName.includes('三通')) score += 20;
            else if (normalizedName.includes('弯头')) score += 20;
        }
        
        // 【v36.9新增】内丝/外丝弯头查询的兜底匹配 —— 确保螺纹弯头比普通弯头得分高
        // 【v36.45修复】支持"弯头内丝"和"内丝弯头"两种顺序
        const hasQueryNeiSiWanTou = /内丝.*弯头|内螺纹.*弯头|弯头.*内丝|弯头.*内螺纹/i.test(query);
        const hasQueryWaiSiWanTou = /外丝.*弯头|外螺纹.*弯头|弯头.*外丝|弯头.*外螺纹/i.test(query);
        if (hasQueryNeiSiWanTou && /内螺纹弯头|Female Thread Elbow/i.test(combinedName)) {
            score += 80; // 内丝弯头查询 → 内螺纹弯头产品大幅加分（必须高于普通弯头的90°加分）
        }
        if (hasQueryWaiSiWanTou && /外螺纹弯头|Male Thread Elbow/i.test(combinedName)) {
            score += 80; // 外丝弯头查询 → 外螺纹弯头产品大幅加分
        }
        
        // 【v36.9修正】内丝/外丝弯头查询时，普通弯头不应该因为"90°"而得到额外加分
        if (hasQueryNeiSiWanTou || hasQueryWaiSiWanTou) {
            // 查询明确指定了螺纹弯头，普通弯头（不含螺纹）应该被降权
            const isOrdinaryElbow = /90[°度]?.*弯头|弯头.*90[°度]?/i.test(combinedName) && 
                                   !/内螺纹|外螺纹|Female Thread|Male Thread/i.test(combinedName);
            if (isOrdinaryElbow) {
                score -= 30; // 普通弯头在螺纹弯头查询中降权
            }
        }
        
        // 【v34新增】角度优先：查询指定角度时，同角度产品额外加分
        // 没指定角度时（只说"弯头"），默认偏好90°
        if (/弯头|elbow/i.test(query)) {
            let preferredAngle = queryAngle; // 如果查询中明确写了90°/45°
            
            // 【规则：没写角度时，默认报90°】
            if (!preferredAngle) {
                preferredAngle = '90'; // 默认偏好90°
            }
            
            if (preferredAngle === '90') {
                // 偏好90°产品：产品名含 "90" 或不含任何角度标识(默认当90°)
                const productHas90 = /90[°度]?/i.test(combinedName);
                const productHas45 = /45[°度]?|斜/i.test(combinedName);
                if (productHas90 && !productHas45) {
                    score += 40; // 明确的90°产品 → 大幅加分
                } else if (!productHas45) {
                    score += 25; // 不含角度标识的产品 → 当作90°处理，适度加分
                }
                // 含45°的产品不加分也不扣分（已通过硬性过滤排除）
            } else if (preferredAngle === '45') {
                const productHas45 = /45[°度]?|斜/i.test(combinedName);
                if (productHas45) {
                    score += 40; // 45°查询 → 45°产品加分
                }
            } else if (preferredAngle === '22.5') {
                const productHas225 = /22\.5[°度]?|11\.25[°度]?/i.test(combinedName);
                if (productHas225) {
                    score += 40; // 22.5°查询 → 22.5°产品加分
                }
            }
        }
        
        // 大小头查询时，确保异径套/大小头类产品有更高优先
        if (hasQueryDaxiaotou) {
            const isProductReducerExact = /异径套|大小头|reducing\s*socket/i.test(combinedName);
            if (isProductReducerExact) {
                score += 50; // 精确的大小头/异径套匹配大幅加分
            }
        }
        
        // 斜三通查询时，Y Branch 产品优先
        if (hasQueryXiesantong) {
            const isYBranch = /y\s*branch|斜三通|异径斜/i.test(combinedName);
            if (isYBranch) {
                score += 50;
            }
        }
    }
    
    // 6. 关键词包含
    const brandNames = ['联塑', 'lesso', 'rucika'];
    const queryWords = queryNormalized.split(/\s+/).filter(w => w.length >= 2 && !brandNames.includes(w));
    for (const word of queryWords) {
        if (word.length >= 3 && normalizedName.includes(word)) {
            if (word === '联体' && normalizedName.includes('联塑')) continue;
            score += 5;
        }
    }
    
    // B/C管等级
    if ((queryNormalized.includes('b管') || queryNormalized.includes('b级')) && (normalizedName.includes('b管') || normalizedName.includes('grade b'))) score += 10;
    if ((queryNormalized.includes('c管') || queryNormalized.includes('c级')) && (normalizedName.includes('c管') || normalizedName.includes('grade c'))) score += 10;
    
    // 材料编码完全匹配
    if (product.material_code && product.material_code.toLowerCase() === queryLower) score += 100;
    
    return score;
}

// 搜索单个关键词
function searchSingleKeyword(keyword, productList = null) {
    if (!keyword.trim()) return null;
    
    const searchList = productList || productsData;
    
    if (searchList.length === 0) {
        console.error('No products loaded!');
        return null;
    }
    
    // 【v36.14修复】添加错误处理，防止单个产品匹配失败导致整个搜索卡住
    const scores = searchList.map(product => {
        try {
            return {
                product,
                score: calculateMatchScore(product, keyword)
            };
        } catch (error) {
            console.error(`[v36.14] 匹配产品 ${product.material_code} 时出错:`, error);
            return {
                product,
                score: 0
            };
        }
    });
    
    // 按分数排序
    scores.sort((a, b) => b.score - a.score);
    
    // 【v36.4修正】过滤掉尺寸不匹配的备选产品
    // 如果查询有明确尺寸，备选产品也必须尺寸兼容
    // 【v36.14优化】使用缓存的sizeInfo
    const querySizeForFilter = extractSize(keyword);
    let validAlternatives = [];
    if (scores.length > 0 && scores[0].score > 0) {
        // 主结果已经通过calculateMatchScore的尺寸检查
        // 备选需要额外检查尺寸兼容性
        if (querySizeForFilter) {
            const querySizeNum = querySizeForFilter.replace(/dn/i, '');
            validAlternatives = scores.slice(1, 6).filter(s => {
                if (s.score <= 0) return false;
                // 【v36.14优化】使用缓存的sizeInfo
                const productSizeInfo = s.product._cache?.sizeInfo || 
                    extractProductPrimarySize((s.product.name_cn || '') + ' ' + (s.product.name_en || ''));
                if (!productSizeInfo) return false; // 有尺寸查询但产品无尺寸 → 排除
                // 必须尺寸兼容
                return isSizeCompatible(querySizeNum, productSizeInfo.primary);
            }).map(s => s.product).slice(0, 3);
        } else {
            // 查询无尺寸，按原逻辑
            validAlternatives = scores.slice(1, 4).filter(s => s.score > 0).map(s => s.product);
        }
        
        return {
            keyword: keyword.trim(),
            product: scores[0].product,
            score: scores[0].score,
            alternatives: validAlternatives
        };
    }
    
    return {
        keyword: keyword.trim(),
        product: null,
        score: 0,
        alternatives: []
    };
}

// 搜索产品
async function searchProducts() {
    const keywordsInput = document.getElementById('keywords').value;
    if (!keywordsInput.trim()) {
        alert('请输入关键词');
        return;
    }
    
    const keywords = keywordsInput.split('\n').filter(k => k.trim());
    if (keywords.length === 0) {
        alert('请输入至少一个关键词');
        return;
    }
    
    // 显示加载状态
    document.getElementById('loading').classList.add('active');
    document.getElementById('results').innerHTML = '';
    document.getElementById('exportButtons').style.display = 'none';
    
    // 获取国标选择状态
    const gbOnly = document.getElementById('gbStandard').checked;
    
    // 【v36.14优化】确保数据已加载（等待预计算完成）
    let allProducts = productsData;
    if (allProducts.length === 0) {
        try {
            if (productsLoadingPromise) {
                allProducts = await productsLoadingPromise;
                productsData = allProducts; // 更新全局变量
            } else {
                allProducts = await loadProducts();
                productsData = allProducts;
            }
        } catch (error) {
            console.error('[v36.14] 加载产品数据失败:', error);
            document.getElementById('loading').classList.remove('active');
            document.getElementById('results').innerHTML = '<div style="padding: 40px; text-align: center; color: #ef4444;">加载产品数据失败，请刷新页面重试</div>';
            return;
        }
    }
    
    // 根据选择过滤产品数据
    // 【v36.66b】传入 keywords，让电工类关键词能保留白名单产品
    let filteredProducts = filterProductsBySource(allProducts, gbOnly, keywords);
    
    // 应用临时过滤规则
    filteredProducts = applyTempFilters(filteredProducts);
    
    // 【v36.4重构】线管模式：优先匹配 803 开头的电工编码，同时排除水管类
    const conduitModeOnly = document.getElementById('conduitMode') && document.getElementById('conduitMode').checked;
    if (conduitModeOnly) {
        // 【v36.4】电线/电工产品的编码前缀（用户提供的136个编码列表）
        // 803002xxxx = 电工配件 | 803004xxxx = 特殊配件 | 803005xxxx = PVC电线管
        const electricalCodePrefixes = ['803002', '803004', '803005'];
        
        // 水管/排水关键词（产品名中包含这些 → 排除）
        const waterExcludePatterns = [
            /给水/i, /water/i, /排水/i, /drain/i, /dwv/i,
            /PVC-U.*Large/i,  // PVC-U Large Radius Tee 等排水管件
            /D排.*水系/i,     // D(排水)系列
            /AW.*(给水|Water)/i,
            /管件.*水管/i, /水管.*管件/i
        ];
        
        filteredProducts = filteredProducts.filter(product => {
            const productCode = String(product.material_code || '');
            const combinedName = (product.name_cn || '') + ' ' + (product.name_en || '');
            
            // 【v36.4优先策略】编码以 803 开头 → 肯定是电工产品，直接保留
            const isElectricalCode = electricalCodePrefixes.some(prefix => 
                productCode.startsWith(prefix)
            );
            if (isElectricalCode) return true;
            
            // 排除水管关键词
            for (const pattern of waterExcludePatterns) {
                if (pattern.test(combinedName)) return false;
            }
            return true;
        });
        console.log(`[线管模式] 过滤后剩余 ${filteredProducts.length} 个线管/电工产品`);
    }
    
    // 【v36.4新增】D系列模式：只保留D排水系列产品，排除给水管件/PPR等
    const dSeriesModeOnly = document.getElementById('dSeriesMode') && document.getElementById('dSeriesMode').checked;
    if (dSeriesModeOnly) {
        const dSeriesPatterns = [
            /D排水/i,                  // D排水系列
            /D.*排水/i,               // D 排水
            /排水系列/i,              // 排水系列
            /PVC-U.*D/i,              // PVC-U D系列
            /Large Radius.*Tee/i,     // Large Radius Tee（排水管件）
            /Drainage/i, /DWV/i,      // 排水相关英文
            /D系列/i                  // D系列
        ];
        // 排除给水管件的关键词
        const waterSupplyPatterns = [
            /PPR/i, /PP-R/i,           // PPR给水
            /给水/i, /water supply/i, /AW/i,  // 给水
            /1\.0MPa/i, /1\.25MPa/i, /1\.6MPa/i, // PPR压力等级
            /PN10/i, /PN12\.5/i, /PN16/i
        ];
        
        filteredProducts = filteredProducts.filter(product => {
            const combinedName = (product.name_cn || '') + ' ' + (product.name_en || '');
            // 必须包含 D排水系列关键词
            const isDSeries = dSeriesPatterns.some(p => p.test(combinedName));
            // 排除给水管件
            const isWaterSupply = waterSupplyPatterns.some(p => p.test(combinedName));
            return isDSeries && !isWaterSupply;
        });
        console.log(`[D排水模式] 过滤后剩余 ${filteredProducts.length} 个D系列排水产品`);
    }
    
    console.log(`[v36.14] Searching in ${gbOnly ? '国标管件' : '默认数据源'}: ${filteredProducts.length} products`);
    
    // 执行搜索
    searchResults = [];
    const searchStartTime = performance.now();
    
    for (const keyword of keywords) {
        const result = searchSingleKeyword(keyword, filteredProducts);
        searchResults.push(result);
    }
    
    const searchEndTime = performance.now();
    console.log(`[v36.14] 搜索完成，${keywords.length} 个关键词，耗时 ${(searchEndTime - searchStartTime).toFixed(2)}ms`);
    
    // 隐藏加载状态
    document.getElementById('loading').classList.remove('active');
    
    // 显示结果
    displayResults(searchResults);
}

// 从中文名称提取尺寸规格
// 【v36.24修正】保留产品名称中的原始大小写（DN/dn/De/de），不再强制转小写
// 【v36.46修复】异径规格优先匹配，确保显示完整的 dn25x20 而不是 dn25
function extractSizeFromName(name) {
    if (!name) return null;
    
    // 【v36.46】优先匹配异径规格 dnXX*XX 或 dnXXxXX（如 dn25x20）
    const reducerDnMatch = name.match(/(dn|DN)\s*(\d+)\s*[\*x]\s*(\d+)/i);
    if (reducerDnMatch) {
        // 异径规格：保留前缀原始大小写，显示完整尺寸
        const prefix = reducerDnMatch[1];
        const large = reducerDnMatch[2];
        const small = reducerDnMatch[3];
        return `${prefix}${large}*${small}`;
    }
    
    // 匹配 DN/dn/De/de + 数字 — 保留原始大小写
    const dnMatch = name.match(/(dn|de|DN|DE)\s*(\d+)/i);
    if (dnMatch) {
        // 保留前缀的原始大小写（DN 或 dn）
        const prefix = dnMatch[1];
        const num = dnMatch[2];
        return `${prefix}${num}`;
    }
    
    // 匹配 Φ/φ/Ø/∅ + 数字 → 用小写 dn 【v36.18d】扩展支持 ∅ U+2205
    const phiMatch = name.match(/[\u03a6\u03c6\u00d8\u2205](\d+)/);
    if (phiMatch) {
        return `dn${phiMatch[1]}`;  // Φ 类统一用 dn
    }
    
    // 匹配裸数字异径规格 数字*数字（无dn前缀）
    const reducerMatch = name.match(/(\d{2,4})\s*[\*x]\s*(\d{2,4})/);
    if (reducerMatch) {
        return `${reducerMatch[1]}*${reducerMatch[2]}`;
    }
    
    return null;
}

// 【v36.19新增】从产品名称提取单位
// 管材单位：4M/根、2.9M/根、4M/pcs
// 配件单位：个、只、套、pcs 等
function extractUnitFromName(name) {
    if (!name) return null;
    
    // 1. 匹配管材长度单位（如 4M/根、2.9M/根、4M/pcs）
    const pipeUnitMatch = name.match(/(\d+(?:\.\d+)?)\s*M\/(根|pcs)/i);
    if (pipeUnitMatch) {
        return `${pipeUnitMatch[1]}M/${pipeUnitMatch[2]}`;
    }
    
    // 2. 匹配配件单位（个、只、套）
    // 优先匹配最具体的单位
    if (name.includes('套')) return '套';
    if (name.includes('只')) return '只';
    if (name.includes('个')) return '个';
    
    // 3. 匹配英文单位
    if (/\bpcs\b/i.test(name)) return 'pcs';
    if (/\bset\b/i.test(name)) return 'set';
    
    return null;
}

// 全局变量控制英文名称显示
let showFullEnglishName = false;

// 切换英文名称显示
function toggleEnglishName() {
    showFullEnglishName = !showFullEnglishName;
    const toggle = document.getElementById('toggleEnName');
    toggle.classList.toggle('active', showFullEnglishName);
    
    // 更新所有英文名称列的显示
    const enNameCells = document.querySelectorAll('.en-name-cell');
    enNameCells.forEach(cell => {
        if (showFullEnglishName) {
            cell.classList.add('full-text');
            cell.textContent = cell.dataset.fullText || '';
        } else {
            cell.classList.remove('full-text');
            cell.textContent = cell.dataset.shortText || '';
        }
    });
}

// 缩短英文名称
function shortenEnglishName(name) {
    if (!name) return '';
    if (name.length <= 30) return name;
    return name.substring(0, 27) + '...';
}

// 显示结果
function displayResults(results) {
    const priceLevel = document.getElementById('priceLevel').value;
    const gbOnly = document.getElementById('gbStandard').checked;
    const peMode = document.getElementById('filterPE')?.checked;
    const resultsDiv = document.getElementById('results');
    
    // 根据数据源确定价格列标题
    let priceLevelName = '出厂价（不含税）';
    if (peMode) {
        // 【v36.93】PE模式
        if (priceLevel === 'price_excl_tax') priceLevelName = '出厂价（不含税）';
        else if (priceLevel === 'price_incl_tax') priceLevelName = '含税价（含PPN 11%）';
    } else if (gbOnly) {
        if (priceLevel === 'level_other') priceLevelName = '其他客户价';
        else if (priceLevel === 'level_e') priceLevelName = '大唐大客户价';
    } else {
        if (priceLevel === 'level_a') priceLevelName = 'A级 - 二级代理';
        else if (priceLevel === 'level_b') priceLevelName = 'B级 - 一级代理';
        else if (priceLevel === 'level_c') priceLevelName = 'C级 - 聚万大客户';
        else if (priceLevel === 'level_d') priceLevelName = 'D级 - 青山大客户';
        else if (priceLevel === 'level_d_low') priceLevelName = 'D低 - 青山降利润率';
        else if (priceLevel === 'level_e') priceLevelName = 'E级 - 大唐大客户';
    }
    
    const matched = results.filter(r => r.product !== null);
    const unmatched = results.filter(r => r.product === null);
    
    // 更新统计
    document.getElementById('stats').style.display = 'flex';
    document.getElementById('totalKeywords').textContent = results.length;
    document.getElementById('matchedCount').textContent = matched.length;
    document.getElementById('unmatchedCount').textContent = unmatched.length;
    
    // 显示切换按钮
    if (matched.length > 0) {
        document.getElementById('toggleContainer').style.display = 'flex';
    }
    
    // 生成表格 - 【v36.15简化版】只显示选择的价格级别
    // 【v36.19】新增"单位"列
    let html = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>查询关键词</th>
                    <th>状态</th>
                    <th>产品编码</th>
                    <th>尺寸</th>
                    <th>产品名称（中文）</th>
                    <th>产品名称（英文）</th>
                    <th>单位</th>
                    <th>${priceLevelName}</th>
                    <th>来源</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // 【v36.31新增】获取法兰模式状态
    const flangeMode = document.getElementById('flangeMode')?.checked;
    
    for (const result of results) {
        if (result.product) {
            const p = result.product;
            const levelPrice = p[priceLevel] || 0;
            const size = extractSizeFromName(p.name_cn);
            const sizeHtml = size ? `<span class="size-badge">${escapeHtml(size)}</span>` : '-';
            const unit = extractUnitFromName(p.name_cn);
            const shortEnName = shortenEnglishName(p.name_en);
            const fullEnName = p.name_en || '';
            
            // 【v36.31新增】法兰套装配套产品展示
            let flangeSetHtml = '';
            if (flangeMode && FLANGE_SET_MAPPING[p.material_code]) {
                const setInfo = FLANGE_SET_MAPPING[p.material_code];
                const gasketProduct = allProducts.find(prod => prod.material_code === setInfo.gasket);
                const boltProduct = allProducts.find(prod => prod.material_code === setInfo.boltCode);
                
                if (gasketProduct || boltProduct) {
                    flangeSetHtml = `
                        <tr style="background: #fffbeb !important;">
                            <td colspan="9" style="padding: 12px 16px; border-top: 2px solid #f59e0b;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 6v6l4 2"></path>
                                    </svg>
                                    <span style="font-weight: 600; color: #92400e; font-size: 13px;">🔧 法兰套装配套产品</span>
                                </div>
                                <div style="display: flex; flex-wrap: wrap; gap: 12px; padding-left: 24px;">
                                    ${gasketProduct ? `
                                        <div style="background: #fff; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px 12px; font-size: 12px;">
                                            <span style="color: #78350f; font-weight: 500;">橡胶垫圈</span>
                                            <code style="background: #fef3c7; padding: 2px 6px; border-radius: 4px; margin: 0 6px; color: #92400e;">${gasketProduct.material_code}</code>
                                            <span style="color: #475569;">${escapeHtml(gasketProduct.name_cn)}</span>
                                            <span style="color: #1a5fb4; font-weight: 600; margin-left: 8px;">${formatPrice(gasketProduct[priceLevel] || 0)}</span>
                                        </div>
                                    ` : ''}
                                    ${boltProduct ? `
                                        <div style="background: #fff; border: 1px solid #fcd34d; border-radius: 6px; padding: 8px 12px; font-size: 12px;">
                                            <span style="color: #78350f; font-weight: 500;">螺栓</span>
                                            <code style="background: #fef3c7; padding: 2px 6px; border-radius: 4px; margin: 0 6px; color: #92400e;">${boltProduct.material_code}</code>
                                            <span style="color: #475569;">${escapeHtml(boltProduct.name_cn)}</span>
                                            <span style="color: #dc2626; font-weight: 600; margin-left: 8px;">×${setInfo.boltCount}个</span>
                                            <span style="color: #1a5fb4; font-weight: 600; margin-left: 8px;">${formatPrice((boltProduct[priceLevel] || 0) * setInfo.boltCount)}</span>
                                        </div>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `;
                }
            }
            
            html += `
                <tr>
                    <td>${escapeHtml(result.keyword)}</td>
                    <td><span class="matched">✓ 匹配</span></td>
                    <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; color: #475569;">${escapeHtml(p.material_code)}</code></td>
                    <td>${sizeHtml}</td>
                    <td class="product-name">${escapeHtml(p.name_cn)}</td>
                    <td class="product-name en-name-cell" data-full-text="${escapeHtml(fullEnName)}" data-short-text="${escapeHtml(shortEnName)}">${escapeHtml(shortEnName)}</td>
                    <td>${unit ? escapeHtml(unit) : '-'}</td>
                    <td class="price">${formatPrice(levelPrice)}</td>
                    <td><span style="background: #f8fafc; padding: 4px 8px; border-radius: 6px; font-size: 12px; color: #64748b; border: 1px solid #e2e8f0;">${escapeHtml(p.sheet)}</span></td>
                </tr>
                ${flangeSetHtml}
            `;
        } else {
            // 【v36.13新增】获取相关供应商推荐
            const relatedSuppliers = getRelatedSuppliers(result.keyword);
            let supplierHtml = '';
            
            if (relatedSuppliers.length > 0) {
                const supplierListHtml = relatedSuppliers.map(s => {
                    const hasAddress = s.address && s.address.trim() !== '' && s.address !== '暂无';
                    return `
                        <div style="font-size: 11px; color: #15803d; background: #dcfce7; padding: 6px 10px; border-radius: 4px; margin-bottom: 4px;">
                            <strong>${s.name}</strong>：${s.products.slice(0, 2).join('、')}
                            ${hasAddress ? `<br><span style="color: #166534; margin-left: 0; display: block; margin-top: 2px;">📍 ${s.address}</span>` : ''}
                            ${s.contact ? `<span style="color: #166534;"> 👤 ${s.contact}</span>` : ''}
                            ${s.phone ? `<span style="color: #166534;"> 📞 ${s.phone}</span>` : ''}
                        </div>
                    `;
                }).join('');
                
                supplierHtml = `
                    <div style="margin-top: 12px; padding: 10px; background: #f0fdf4; border-radius: 6px; border: 1px solid #86efac;">
                        <div style="font-size: 12px; color: #166534; font-weight: 600; margin-bottom: 6px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2" style="vertical-align: middle; margin-right: 4px;">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            </svg>
                            相关供应商推荐：
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            ${supplierListHtml}
                        </div>
                    </div>
                `;
            }
            
            html += `
                <tr>
                    <td>${escapeHtml(result.keyword)}</td>
                    <td><span class="unmatched">✗ 无货</span></td>
                    <td colspan="7" style="color: #94a3b8; padding: 16px;">
                        <div style="font-style: italic; margin-bottom: 4px;">未找到匹配产品</div>
                        ${supplierHtml}
                    </td>
                </tr>
            `;
        }
    }
    
    html += '</tbody></table>';
    resultsDiv.innerHTML = html;
    
    // 显示导出按钮
    if (matched.length > 0) {
        document.getElementById('exportButtons').style.display = 'flex';
    }
    
    // 重置切换状态
    showFullEnglishName = false;
    document.getElementById('toggleEnName').classList.remove('active');
}

// 格式化价格
function formatPrice(price) {
    if (!price || price === 0) return '-';
    // 使用逗号作为千位分隔符（如 1,234,567）
    return 'Rp ' + Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 【v36.2新增】过滤非产品信息，只保留管件产品相关关键词
// 场景：上传Excel报价单/图片OCR后，自动去除客户姓名、电话、地址、日期等无关信息
function cleanProductText(rawText) {
    if (!rawText) return '';
    
    let text = rawText;
    
    // ===== 【v36.23b新增】OCR纠错映射：修正常见的OCR识别错误 =====
    const ocrCorrections = {
        // 表格符号和分隔符清理
        '丨': ' ',
        '┃': ' ',
        '|': ' ',
        '—': '-',
        '_': ' ',
        // 各种引号（中文和英文）
        '"': ' ',  // 英文双引号
        '"': ' ',  // 中文双引号
        "'": ' ',  // 英文单引号
        '\u2018': ' ',  // 中文左单引号
        '\u2019': ' ',  // 中文右单引号
        '`': ' ',
        '" ': ' ',
        ' "': ' ',
        '" ': ' ',
        ' "': ' ',
        '  ': ' ',
        '  ': ' ',
        '一 ': '',
        ' 一': '',
        // 行首引号特殊处理
        '\n"': '\n',
        '\n" ': '\n',
        // 数字纠错
        '-0': '10',
        ' -0': ' 10',
        '28 个': 'DN32 个',
        '截止阀 28 个': '截止阀 DN32 个',
        '2 88': '28',
        '288': '28',
        '一30': '30',
        '一16': '16',
        '一6': '6',
        '一14': '14',
        '一20': '20',
        '个 1 ': '个 ',
        '_ 个': '个',
        '_个': '个',
        ' 1 DN32': ' DN32',
        '1 DN32': 'DN32',
        '28 个 -0': '个 10',
        // 产品名称纠错
        '与 通': '三通',
        '与通': '三通',
        '夺 头': '弯头',
        '夺头': '弯头',
        '变 径': '变径',
        '取 径': '变径',
        '取径': '变径',
        '作 缩 节': '伸缩节',
        '作缩节': '伸缩节',
        '_ 伸缩节': '伸缩节',
        '_伸缩节': '伸缩节',
        '梁 E 国': '截止阀',
        '梁E国': '截止阀',
        '截 E 阀': '截止阀',
        '截E阀': '截止阀',
        '截 止 国': '截止阀',
        '榴 闹': '截止阀',
        '榴闹': '截止阀',
        '截 止 闹': '截止阀',
        '截止闹': '截止阀',
        // 单位纠错
        '全 十': '个',
        '十 时': '个',
        '时 -0': '10',
    };
    
    for (const [wrong, correct] of Object.entries(ocrCorrections)) {
        text = text.replace(new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correct);
    }
    
    // 清理多余空格：合并连续空格，去除行首尾空格
    text = text.replace(/ +/g, ' ').trim();
    
    // 清理行首的引号（处理OCR残留的分隔符）
    text = text.replace(/^["\s]+/gm, '');
    
    // ===== 1. 去除人名（中文姓名：2-4个字的中文 + 可能有空格）=====
    // 匹配常见中文姓名模式（在行首或单独出现的）
    text = text.replace(/(?:^|[\s,;，；])[\u4e00-\u9fa5]{2,4}(?=[\s,;，;\n]|$)/g, (match) => {
        // 排除包含产品关键词的"名字"（如 "正三通"、"大小头"）
        if (/弯头|三通|直通|管帽|套筒|接头|法兰|阀门|管子|水管|异径|大小头|给水|排水|电线|线管|管材|配件|管件|堵头|伸缩|截止|变径/.test(match)) return match;
        return ''; // 纯人名 → 删除
    });
    
    // ===== 2. 去除手机号/电话（11位手机、固定电话、带区号的）=====
    text = text.replace(/(?<![0-9a-zA-Z])1[3-9]\d{9}(?![0-9a-zA-Z])/g, '');  // 手机号
    text = text.replace(/(?<![0-9])0?\d{3,4}[-\s]?\d{7,8}(?![0-9])/g, '');     // 固定电话
    text = text.replace(/(?<![0-9])\(?\d{3,4}\)?[-\s]?\d{7,8}(?![0-9])/g, '');  // 带括号
    
    // ===== 3. 去除邮箱地址 =====
    text = text.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');
    
    // ===== 4. 去除完整地址（含省市区路号门牌的）=====
    // 匹配：XX省XX市XX区XX路XX号 / XX街道XX号 等
    text = text.replace(/[\u4e00-\u9fa5]{2,}(?:省|自治区|市|特别行政区)[\u4e00-\u9fa5]{0,6}(?:市|县|区|旗)[\u4e00-\u9fa5]{0,15}(?:街道|镇|乡|路|街|道|巷|弄|胡同|村|大道|公路|广场|花园|小区|苑|城|大厦|楼|广场|中心|市场|商贸|建材|五金|水暖|机电|批发|仓库|工厂|厂|园|基地|港|码头|机场|车站|港口)[\u4e00-\u9fa5\d\-]*?(?:号|\d+号|栋|幢|单元|层|室|铺|房|楼|馆|所|店|部|局|院|校|行|社|站)/g, '');
    // 短地址兜底：XX路XX号 / XX街道XX号
    text = text.replace(/[\u4e00-\u9fa5]{2,10}(?:路|街|道|巷|弄|胡同)(?:\d+[号栋幢]?|[－-]\d+[号栋幢]?)/g, '');
    
    // ===== 5. 去除日期格式 =====
    text = text.replace(/\d{4}[-\/年]\d{1,2}[-\/月]\d{1,2}[日号]?/g, '');   // 2026-04-20 或 2026年04月20日
    text = text.replace(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g, '');             // 04-20-2026 或 20-04-26
    text = text.replace(/\d{4}[\/\.]\d{1,2}[\/\.]\d{1,2}/g, '');              // 2026/04/20
    text = text.replace(/(?:星期|周)[一二三四五六日天]/g, '');                // 星期一 ~ 星期天
    
    // ===== 6. 去除独立的价格数字（Rp/¥/$ 开头的金额）但保留产品编码中的数字 =====
    // Rp xxx.xxx 或 Rpxxx 格式
    text = text.replace(/\bRp\s*[\d,]+\.?\d*\b/gi, '');
    // ¥xxx 或 $xxx 格式（独立的）
    text = text.replace(/(?<=\s)[¥$]\s*[\d,]+\.?\d*(?=\s|$|[,，])/g, '');
    
    // ===== 7. 去除常见的非产品列标题/无关词 =====
    const noiseWords = [
        '客户', '客户名', '客户名称', '姓名', '联系人', '联系', '联系电话', '电话', '手机',
        '手机号', '传真', '邮箱', 'Email', '地址', '详细地址', '送货地址', '收货地址',
        '备注', '说明', '备注信息', '订单号', '单号', '编号', '序号', 'No',
        '日期', '下单时间', '时间', '创建时间', '更新时间',
        '合计', '总计', '小计', '金额', '总价', '数量合计', '金额合计',
        '制表', '审核', '批准', '签字', '签名', '盖章', '打印', '页码',
        '第.*页', '共.*页', 'Page', 'Sheet', '工作表',
        '单位', '公司', '有限公司', '有限责任公司', '集团', '股份'
    ];
    for (const word of noiseWords) {
        const re = new RegExp(`\\b${word}\\b(:?[：:]\\s*)?`, 'gi');
        text = text.replace(re, '');
    }
    
    // ===== 8. 清理多余空白和空行 =====
    text = text.replace(/[ \t]+/g, ' ');           // 多空格→单空格
    text = text.replace(/^\s+|\s+$/gm, '');       // 行首尾去空格
    text = text.replace(/\n{3,}/g, '\n\n');       // 多空行→最多2个
    text = text.replace(/^[\s,;，；]+$/gm, '');   // 只剩标点的空行→删除
    text = text.trim();
    
    return text;
}

// 处理文件上传
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // xlsx 文件使用 SheetJS 解析
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        parseExcelFile(file);
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        // 【v36.2新增】过滤非产品信息
        const cleanedContent = cleanProductText(content);
        document.getElementById('keywords').value = cleanedContent;
    };
    
    reader.readAsText(file);
}

// 【v35新增】使用 SheetJS (xlsx.js) 解析 Excel 文件
async function parseExcelFile(file) {
    const textarea = document.getElementById('keywords');
    textarea.placeholder = '正在解析Excel文件...';
    textarea.value = '';
    
    try {
        // 动态加载 SheetJS (如果还没加载)
        if (typeof XLSX === 'undefined') {
            await loadSheetJS();
        }
        
        // 读取文件
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 取第一个工作表
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        
        // 转换为 JSON 数组
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        
        // 提取所有非空单元格内容，每行合并为一个查询关键词
        let keywords = [];
        for (const row of rows) {
            // 过滤掉空行和全空格的行
            const line = row.map(cell => String(cell).trim()).filter(cell => cell).join(' ');
            if (line.trim()) {
                // 【v36.2新增】过滤非产品信息（人名、电话、地址等）
                const cleanedLine = cleanProductText(line);
                if (cleanedLine.trim()) {
                    keywords.push(cleanedLine);
                }
            }
        }
        
        if (keywords.length > 0) {
            textarea.value = keywords.join('\n');
            textarea.placeholder = '例如：\nDN50白色给水管4米\nPVC排水管dn75\ngrey pipe 3/4 inch\nRUCIKA STANDARD AW 1/2"\n...';
            console.log(`Excel解析完成，共提取 ${keywords.length} 条记录`);
        } else {
            alert('Excel文件中没有找到有效数据');
            textarea.placeholder = '例如：\nDN50白色给水管4米\nPVC排水管dn75\ngrey pipe 3/4 inch\nRUCIKA STANDARD AW 1/2"\n...';
        }
    } catch (err) {
        console.error('Excel解析失败:', err);
        alert('Excel文件解析失败: ' + (err.message || '请检查文件格式'));
        textarea.placeholder = '例如：\nDN50白色给水管4米\nPVC排水管dn75\ngrey pipe 3/4 inch\nRUCIKA STANDARD AW 1/2"\n...';
    }
}

// 动态加载 SheetJS 库
function loadSheetJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('SheetJS库加载失败，请检查网络连接'));
        document.head.appendChild(script);
    });
}

// 【v35新增】清空所有输入和结果
function clearAll() {
    // 清空输入框
    document.getElementById('keywords').value = '';
    
    // 重置结果区域
    document.getElementById('results').innerHTML = `
        <div class="no-results">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
                <path d="M8 11h6"></path>
            </svg>
            <p>在左侧输入关键词开始查询</p>
            <p style="font-size: 13px; margin-top: 8px;">支持批量输入，每行一个关键词</p>
        </div>
    `;
    
    // 隐藏统计和导出按钮
    document.getElementById('stats').style.display = 'none';
    document.getElementById('exportButtons').style.display = 'none';
    document.getElementById('toggleContainer').style.display = 'none';
    
    // 隐藏图片预览
    document.getElementById('imagePreview').style.display = 'none';
    
    // 重置搜索结果
    searchResults = [];
    
    // 重置文件选择器
    document.getElementById('fileInput').value = '';
    document.getElementById('imageInput').value = '';
}

// 【v36.9新增】清除已上传的图片
function clearImage() {
    // 隐藏图片预览区域
    document.getElementById('imagePreview').style.display = 'none';
    
    // 清空预览图片
    document.getElementById('previewImg').src = '';
    
    // 重置图片文件选择器（允许重新上传同一张图片）
    document.getElementById('imageInput').value = '';
    
    console.log('[v36.9] 图片已清除');
}

// 处理图片上传
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    handleImageFile(file);
}

// 统一处理图片文件
function handleImageFile(file) {
    // 显示预览
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImg').src = e.target.result;
        document.getElementById('imagePreview').style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // 使用Tesseract.js进行OCR识别
    loadTesseractAndPerformOCR(file);
}

// Tesseract worker 缓存
let tesseractWorker = null;
let isLoadingWorker = false;

// 预加载Tesseract（页面加载后开始下载语言包）
function preloadTesseract() {
    // 如果存在旧版本，跳过预加载
    if (typeof Tesseract !== 'undefined' && Tesseract.version && Tesseract.version.startsWith('4')) {
        console.log('检测到旧版本 Tesseract v4，跳过预加载');
        return;
    }
    
    if (typeof Tesseract !== 'undefined' && !tesseractWorker && !isLoadingWorker) {
        console.log('开始预加载Tesseract语言包...');
        createTesseractWorker().then(() => {
            console.log('Tesseract语言包预加载完成');
        }).catch(err => {
            console.log('语言包预加载失败:', err);
        });
    } else if (typeof Tesseract === 'undefined') {
        // 如果Tesseract还未加载，先加载脚本
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js?v=5';
        script.onload = function() {
            console.log('Tesseract.js v5 预加载完成');
            createTesseractWorker().catch(err => {
                console.log('Worker预创建失败:', err);
            });
        };
        document.head.appendChild(script);
    }
}

// 创建Tesseract worker
async function createTesseractWorker() {
    if (tesseractWorker) {
        return tesseractWorker;
    }
    
    if (isLoadingWorker) {
        // 等待加载完成
        while (isLoadingWorker) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return tesseractWorker;
    }
    
    isLoadingWorker = true;
    
    try {
        // 使用 Tesseract.js v5 的 API
        // 配置语言包下载路径使用本地路径
        const localLangPath = window.location.origin + '/tesseract-lang';
        console.log('尝试使用本地语言包路径:', localLangPath);
        
        // 使用完整版语言包（42MB，精度更高）
        // 快速版虽然体积小但识别精度差，不适合表格识别
        const langPackName = 'chi_sim';
        const loadingMsg = '约40MB数据（精度更高）';
        
        console.log(`[Tesseract] 开始创建 Worker，语言包: ${langPackName}, 路径: ${localLangPath}`);
        
        tesseractWorker = await Tesseract.createWorker(langPackName, 1, {
            langPath: localLangPath,
            logger: m => {
                const textarea = document.getElementById('keywords');
                console.log('[Tesseract Logger]', m.status, m.progress);
                if (m.status === 'recognizing text') {
                    textarea.placeholder = `正在识别文字... ${(m.progress * 100).toFixed(0)}%`;
                } else if (m.status === 'loading language traineddata') {
                    const percent = (m.progress * 100).toFixed(0);
                    textarea.placeholder = `正在加载语言包... ${percent}% (首次使用需要加载${loadingMsg}，请耐心等待)`;
                    console.log(`[Tesseract] 加载进度: ${percent}%`);
                } else if (m.status === 'initializing api') {
                    textarea.placeholder = `正在初始化识别引擎... ${(m.progress * 100).toFixed(0)}%`;
                }
            },
            errorHandler: err => {
                console.error('[Tesseract Error]', err);
                // 在界面上显示错误
                const textarea = document.getElementById('keywords');
                if (textarea) {
                    textarea.placeholder = `OCR加载失败: ${err.message || '请检查控制台'}`;
                }
            }
        });
        console.log('Worker创建成功，使用语言包:', langPackName);
    } catch (err) {
        console.error('Worker创建失败:', err);
        throw err;
    } finally {
        isLoadingWorker = false;
    }
    
    return tesseractWorker;
}

// 加载Tesseract并执行OCR
function loadTesseractAndPerformOCR(file) {
    const textarea = document.getElementById('keywords');
    textarea.value = '';
    textarea.placeholder = '正在加载OCR引擎...';
    
    // 强制清除Worker缓存，确保使用完整版语言包
    if (tesseractWorker) {
        console.log('清除旧Worker，重新加载完整版语言包');
        tesseractWorker.terminate().catch(() => {});
        tesseractWorker = null;
    }
    
    // 如果存在旧版本，先清除
    if (typeof Tesseract !== 'undefined' && Tesseract.version && Tesseract.version.startsWith('4')) {
        console.log('检测到旧版本 Tesseract v4，需要重新加载 v5');
        // 强制重新加载 v5
        const oldScript = document.querySelector('script[src*="tesseract.js@4"]');
        if (oldScript) oldScript.remove();
    }
    
    if (typeof Tesseract === 'undefined' || (Tesseract.version && Tesseract.version.startsWith('4'))) {
        // 动态加载Tesseract.js v5
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js?v=5';
        script.onload = function() {
            console.log('Tesseract.js v5 loaded, version:', Tesseract.version);
            performOCRWithWorker(file);
        };
        script.onerror = function() {
            textarea.placeholder = 'OCR引擎加载失败';
            alert('OCR引擎加载失败，请检查网络连接或关闭浏览器的"跟踪防护"功能');
        };
        document.head.appendChild(script);
        console.log('开始加载 Tesseract.js v5...');
    } else {
        performOCRWithWorker(file);
    }
}

// 图片预处理：增强对比度、二值化，提高OCR精度
async function preprocessImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置画布尺寸（限制最大尺寸以提高性能）
            const maxWidth = 2000;
            const maxHeight = 2000;
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.floor(width * ratio);
                height = Math.floor(height * ratio);
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // 绘制原图
            ctx.drawImage(img, 0, 0, width, height);
            
            // 获取图像数据
            const imageData = ctx.getImageData(0, 0, width, height);
            const data = imageData.data;
            
            // 灰度化 + 自适应二值化（Otsu算法简化版）
            // 先计算全局平均亮度
            let totalBrightness = 0;
            for (let i = 0; i < data.length; i += 4) {
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                totalBrightness += gray;
            }
            const avgBrightness = totalBrightness / (data.length / 4);
            
            // 根据平均亮度动态计算阈值
            const threshold = avgBrightness * 0.85; // 略低于平均值
            
            for (let i = 0; i < data.length; i += 4) {
                // 灰度化
                const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                
                // 轻度对比度增强
                const contrast = 1.2;
                const enhanced = ((gray - 128) * contrast) + 128;
                
                // 自适应二值化
                const binary = enhanced > threshold ? 255 : 0;
                
                data[i] = binary;     // R
                data[i + 1] = binary; // G
                data[i + 2] = binary; // B
            }
            
            // 将处理后的数据写回画布
            ctx.putImageData(imageData, 0, 0);
            
            // 转换为Blob
            canvas.toBlob(function(blob) {
                URL.revokeObjectURL(url);
                resolve(blob);
            }, 'image/png');
        };
        
        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error('图片加载失败'));
        };
        
        img.src = url;
    });
}

// 执行OCR识别（使用worker模式，更快）
async function performOCRWithWorker(file) {
    const textarea = document.getElementById('keywords');
    const originalPlaceholder = '例如：\nDN50白色给水管4米\nPVC排水管dn75\ngrey pipe 3/4 inch\nRUCIKA STANDARD AW 1/2"\n...';
    textarea.placeholder = '正在预处理图片...';
    textarea.value = '';
    
    try {
        // 创建worker（如果已预加载则直接使用）
        const worker = await createTesseractWorker();
        
        // 图片预处理
        textarea.placeholder = '正在增强图片清晰度...';
        const processedBlob = await preprocessImage(file);
        
        // 创建处理后的图片URL
        const imageUrl = URL.createObjectURL(processedBlob);
        
        textarea.placeholder = '正在识别文字...';
        
        // 使用worker进行识别（v5 API兼容）
        let result;
        try {
            result = await worker.recognize(imageUrl);
        } catch (recognizeErr) {
            console.error('recognize调用失败:', recognizeErr);
            // 尝试v4兼容模式
            if (worker.recognize) {
                result = await worker.recognize(imageUrl);
            } else {
                throw recognizeErr;
            }
        }
        
        // 释放URL对象
        URL.revokeObjectURL(imageUrl);
        
        // v5 API 返回格式: result.data.text
        const text = result && result.data && result.data.text ? result.data.text.trim() : '';
        if (text) {
            // 【v36.2新增】过滤非产品信息（人名、电话、地址、日期等）
            const cleanedText = cleanProductText(text);
            textarea.value = cleanedText;
            textarea.placeholder = originalPlaceholder;
            console.log('OCR识别结果:', text);
        } else {
            textarea.placeholder = originalPlaceholder;
            alert('未能识别到文字，请尝试上传更清晰的图片');
        }
    } catch (err) {
        console.error('OCR识别失败:', err);
        textarea.placeholder = originalPlaceholder;
        
        // 显示详细错误信息
        let errorMsg = err.message || '请检查网络连接或稍后重试';
        if (err.message && err.message.includes('network')) {
            errorMsg = '网络连接失败，无法下载OCR语言包';
        } else if (err.message && err.message.includes('Error loading')) {
            errorMsg = '语言包加载失败，请检查网络连接';
        }
        alert('图片识别失败: ' + errorMsg);
        
        // 重置worker以便下次重试
        if (tesseractWorker) {
            try {
                await tesseractWorker.terminate();
            } catch (e) {}
            tesseractWorker = null;
        }
    }
}

// 保留旧函数用于兼容
async function performOCR(file) {
    return performOCRWithWorker(file);
}

// 导出CSV
function exportToCSV() {
    const priceLevel = document.getElementById('priceLevel').value;
    const levelName = document.getElementById('priceLevel').options[document.getElementById('priceLevel').selectedIndex].text;
    
    // 【v36.15简化版】只导出选择的价格级别
    // 【v36.19】新增"单位"列
    let csv = '查询关键词,匹配状态,产品编码,尺寸,产品名称（中文）,产品名称（英文）,单位,' + levelName + ',来源\n';
    
    for (const result of searchResults) {
        if (result.product) {
            const p = result.product;
            const levelPrice = p[priceLevel] || 0;
            const size = extractSizeFromName(p.name_cn);
            const unit = extractUnitFromName(p.name_cn);
            
            csv += [
                result.keyword,
                '匹配',
                p.material_code,
                size || '',
                `"${(p.name_cn || '').replace(/"/g, '""')}"`,
                `"${(p.name_en || '').replace(/"/g, '""')}"`,
                unit || '',
                levelPrice,
                p.sheet
            ].join(',') + '\n';
        } else {
            csv += [result.keyword, '未匹配', '', '', '', '', '', '', ''].join(',') + '\n';
        }
    }
    
    downloadFile(csv, 'price_match_results.csv', 'text/csv;charset=utf-8;');
}

// 导出Excel（实际是HTML表格，包含页面所有列）
function exportToExcel() {
    const priceLevel = document.getElementById('priceLevel').value;
    const levelName = document.getElementById('priceLevel').options[document.getElementById('priceLevel').selectedIndex].text;
    
    // 【v36.15简化版】只导出选择的价格级别
    let html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
        <head>
            <meta charset="UTF-8">
            <style>
                table { border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 8px; }
                th { background: #f0f0f0; }
            </style>
        </head>
        <body>
            <table>
                <tr>
                    <th>查询关键词</th>
                    <th>匹配状态</th>
                    <th>产品编码</th>
                    <th>尺寸</th>
                    <th>产品名称（中文）</th>
                    <th>产品名称（英文）</th>
                    <th>单位</th>
                    <th>${levelName}</th>
                    <th>来源</th>
                </tr>
    `;
    
    for (const result of searchResults) {
        if (result.product) {
            const p = result.product;
            const levelPrice = p[priceLevel] || 0;
            const size = extractSizeFromName(p.name_cn);
            const unit = extractUnitFromName(p.name_cn);
            
            html += `
                <tr>
                    <td>${escapeHtml(result.keyword)}</td>
                    <td>匹配</td>
                    <td>${escapeHtml(p.material_code)}</td>
                    <td>${size || ''}</td>
                    <td>${escapeHtml(p.name_cn)}</td>
                    <td>${escapeHtml(p.name_en)}</td>
                    <td>${unit || ''}</td>
                    <td>${levelPrice}</td>
                    <td>${escapeHtml(p.sheet)}</td>
                </tr>
            `;
        } else {
            html += `
                <tr>
                    <td>${escapeHtml(result.keyword)}</td>
                    <td>未匹配</td>
                    <td colspan="6"></td>
                </tr>
            `;
        }
    }
    
    html += '</table></body></html>';
    downloadFile(html, 'price_match_results.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// 下载文件
function downloadFile(content, filename, mimeType) {
    const blob = new Blob(['\ufeff' + content], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}

// 根据国标/PE选择更新价格级别选项
function updatePriceLevelOptions() {
    const gbStandard = document.getElementById('gbStandard').checked;
    const peMode = document.getElementById('filterPE')?.checked;
    const priceLevelSelect = document.getElementById('priceLevel');
    const priceLevelNote = document.getElementById('priceLevelNote');
    
    // 保存当前选择
    const currentValue = priceLevelSelect.value;
    
    // 清空选项
    priceLevelSelect.innerHTML = '';
    
    if (peMode) {
        // 【v36.93新增】PE模式：优先显示出厂价（不含税），同时提供含税选项
        priceLevelSelect.innerHTML = `
            <option value="price_excl_tax" selected>出厂价（不含税）</option>
            <option value="price_incl_tax">含税价（×1.11 PPN）</option>
        `;
        priceLevelNote.textContent = '使用 PE给水管 价格体系（2026.04.15出厂价）';
    } else if (gbStandard) {
        // 国标管件价格选项，默认选中大唐价格
        priceLevelSelect.innerHTML = `
            <!-- <option value="price_excl_tax">出厂价（不含税）</option> -->
            <option value="level_other">其他客户价</option>
            <option value="level_e" selected>大唐大客户价</option>
        `;
        priceLevelNote.textContent = '使用国标管件工作簿的价格体系';
    } else {
        // 默认价格选项（LESSO管材）
        priceLevelSelect.innerHTML = `
            <!-- <option value="price_excl_tax">仅出厂价（不含税）</option> -->
            <option value="level_b" selected>B级 - 一级代理</option>
            <option value="level_a">A级 - 二级代理</option>
            <option value="level_c">C级 - 聚万大客户</option>
            <option value="level_d">D级 - 青山大客户</option>
            <option value="level_d_low">D低 - 青山降利润率</option>
            <option value="level_e">E级 - 大唐大客户</option>
        `;
        priceLevelNote.textContent = '使用LESSO管材工作簿的价格体系';
    }
}

// ==================== 【v36.13新增】供应商查询功能 ====================

// 供应商数据
let suppliersData = [];

// 加载供应商数据
async function loadSuppliers() {
    try {
        const response = await fetch('suppliers.json?v=1');
        const data = await response.json();
        suppliersData = data.suppliers || [];
        console.log(`[v36.13] 加载了 ${suppliersData.length} 家供应商`);
    } catch (error) {
        console.error('[v36.13] 加载供应商数据失败:', error);
        suppliersData = [];
    }
}

// 搜索供应商（支持异步加载数据）
async function searchSuppliers(keyword) {
    // 确保数据已加载
    if (suppliersData.length === 0) {
        console.log('[v36.13] 供应商数据未加载，正在加载...');
        await loadSuppliers();
    }
    
    if (!keyword || keyword.trim() === '') {
        document.getElementById('supplierResults').innerHTML = `
            <p style="font-size: 13px; color: #94a3b8; text-align: center; padding: 20px;">
                输入关键词搜索相关供应商
            </p>
        `;
        return;
    }
    
    keyword = keyword.toLowerCase().trim();
    console.log(`[v36.13] 搜索供应商: "${keyword}"，当前数据: ${suppliersData.length} 家`);
    
    // 匹配供应商
    const matched = suppliersData.filter(supplier => {
        // 检查供应商名称
        if (supplier.name.toLowerCase().includes(keyword)) return true;
        if (supplier.nameEn && supplier.nameEn.toLowerCase().includes(keyword)) return true;
        
        // 检查产品列表
        if (supplier.products && supplier.products.some(p => p.toLowerCase().includes(keyword))) {
            return true;
        }
        
        // 检查产品关键词
        if (supplier.productKeywords && supplier.productKeywords.some(k => k.toLowerCase().includes(keyword))) {
            return true;
        }
        
        return false;
    });
    
    displaySupplierResults(matched, keyword);
}

// 显示供应商结果
function displaySupplierResults(suppliers, keyword = '') {
    const container = document.getElementById('supplierResults');
    
    if (suppliers.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #94a3b8;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5" style="margin-bottom: 8px;">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p style="font-size: 13px;">未找到相关供应商</p>
                <p style="font-size: 12px; margin-top: 4px;">请尝试其他关键词</p>
            </div>
        `;
        return;
    }
    
    let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
    
    suppliers.forEach(supplier => {
        const hasAddress = supplier.address && supplier.address.trim() !== '' && supplier.address !== '暂无';
        
        html += `
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    <strong style="color: #059669; font-size: 14px;">${supplier.name}</strong>
                    ${supplier.nameEn ? `<span style="color: #94a3b8; font-size: 12px;">(${supplier.nameEn})</span>` : ''}
                </div>
                <div style="font-size: 12px; color: #475569; line-height: 1.6;">
                    <div style="margin-bottom: 4px;">
                        <span style="color: #64748b;">主营：</span>
                        <span style="color: #334155;">${supplier.products.slice(0, 3).join('、')}</span>
                        ${supplier.products.length > 3 ? '...' : ''}
                    </div>
                    ${hasAddress ? `
                        <div style="margin-bottom: 4px; display: flex; gap: 4px;">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" style="flex-shrink: 0; margin-top: 2px;">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span style="color: #475569; word-break: break-all;">${supplier.address}</span>
                        </div>
                    ` : ''}
                    ${supplier.contact ? `<div style="color: #64748b;">联系人：${supplier.contact}</div>` : ''}
                    ${supplier.phone ? `<div style="color: #64748b;">电话：${supplier.phone}</div>` : ''}
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    container.innerHTML = html;
}

// 显示全部供应商（支持异步加载数据）
async function showAllSuppliers() {
    // 确保数据已加载
    if (suppliersData.length === 0) {
        console.log('[v36.13] 供应商数据未加载，正在加载...');
        await loadSuppliers();
    }
    console.log(`[v36.13] 显示全部供应商: ${suppliersData.length} 家`);
    displaySupplierResults(suppliersData);
}

// 获取相关产品供应商（用于无货时推荐）
function getRelatedSuppliers(productName) {
    if (!productName || suppliersData.length === 0) return [];
    
    productName = productName.toLowerCase();
    
    // 计算匹配度
    const scored = suppliersData.map(supplier => {
        let score = 0;
        
        // 产品关键词匹配
        if (supplier.productKeywords) {
            for (const keyword of supplier.productKeywords) {
                if (productName.includes(keyword.toLowerCase())) {
                    score += 10;
                }
            }
        }
        
        // 产品列表匹配
        if (supplier.products) {
            for (const product of supplier.products) {
                if (productName.includes(product.toLowerCase())) {
                    score += 8;
                }
            }
        }
        
        return { supplier, score };
    });
    
    // 过滤并排序
    return scored
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)  // 只返回前3个
        .map(item => item.supplier);
}

// 页面加载时初始化
// 【v36.14优化】改为非阻塞加载，优先加载产品数据
let productsLoadingPromise = null;

// 【v36.66b】显示版本号，帮助确认是否加载了最新版本
(function showVersion() {
    const verEl = document.getElementById('version-display');
    if (verEl) verEl.textContent = 'v36.90';
})();

document.addEventListener('DOMContentLoaded', async function() {
    const startTime = performance.now();
    
    // 优先加载产品数据（带预计算）
    productsLoadingPromise = loadProducts().then(products => {
        productsData = products;
        const endTime = performance.now();
        console.log(`[v36.14] 产品数据加载完成，总耗时 ${(endTime - startTime).toFixed(2)}ms`);
        return products;
    });
    
    // 【v36.14】供应商数据延迟加载，不阻塞主流程
    setTimeout(() => {
        loadSuppliers().then(() => {
            console.log('[v36.14] 供应商数据后台加载完成');
        });
    }, 100);
    
    updatePriceLevelOptions();
    setupDragAndDrop();
    
    // 延迟预加载Tesseract（页面加载完成后再开始）
    setTimeout(preloadTesseract, 3000);
    
    const initEndTime = performance.now();
    console.log(`[v36.14] 页面初始化完成，耗时 ${(initEndTime - startTime).toFixed(2)}ms`);
});

// 设置拖拽上传
function setupDragAndDrop() {
    const dropZone = document.getElementById('imageDropZone');
    if (!dropZone) return;
    
    // 阻止默认拖拽行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // 拖拽进入和悬停效果
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, function() {
            dropZone.style.background = 'linear-gradient(135deg, #fde68a 0%, #fcd34d 100%)';
            dropZone.style.borderColor = '#d97706';
            dropZone.style.transform = 'scale(1.02)';
        }, false);
    });
    
    // 拖拽离开效果
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, function() {
            dropZone.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
            dropZone.style.borderColor = '#f59e0b';
            dropZone.style.transform = 'scale(1)';
        }, false);
    });
    
    // 处理拖拽放下
    dropZone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            handleImageFile(file);
        } else {
            alert('请上传图片文件');
        }
    }
}
