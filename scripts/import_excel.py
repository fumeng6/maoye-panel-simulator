"""将两种固定布局的 Excel 数值同步到中文 JSON。只用 Python 标准库。

默认只列出差异；加 --write 才写入。Excel 公式读取已保存的计算结果，
没有缓存的公式会报出具体单元格，请在 Excel / WPS 中重新计算并保存。
"""
import argparse
import copy
import json
import re
import zipfile
from datetime import date
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data/game"
NS = {"s": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
ALIASES = {"无名剑法": "无名心法", "霜天百夜": "霜天白夜"}


def is_defensive(name):
    if name == "明川药典·治疗技增疗":
        return False
    return name in ["体", "御"] or bool(re.search(r"气血|防御|抗性|护盾|治疗|增疗|减伤", name))


def offensive_data(data):
    """保留攻击属性和牵丝霖治疗技定音；同步时剔除其他防御项。"""
    def stats(attrs):
        return {k: v for k, v in attrs.items() if not is_defensive(k)}
    for group, attrs in data["基础属性"]["基础来源"].items():
        data["基础属性"]["基础来源"][group] = stats(attrs)
    hearts = data["心法"]
    for category, attrs in hearts["数值总表"].items():
        hearts["数值总表"][category] = stats(attrs)
    for book in hearts["心法"].values():
        book["属性"] = [k for k in book["属性"] if not is_defensive(k)]
        for key in ["取值", "数值覆盖"]:
            if key in book:
                book[key] = stats(book[key])
                if not book[key]:
                    book.pop(key)
    schools = data["流派"]
    for variants in schools["流派"].values():
        for config in variants.values():
            config["天赋属性"] = [k for k in config["天赋属性"] if not is_defensive(k)]
    data["套装"]["分类"].pop("防具", None)
    data["套装"]["数值总表"] = stats(data["套装"]["数值总表"])
    data["套装"]["元数据"].pop("旧值说明", None)
    aff = data["装备词条"]
    aff["属性"] = stats(aff["属性"])
    for name in ["单体类奇术增伤", "群体类奇术增伤"]:
        if name in aff["属性"]:
            aff["属性"]["全奇术增伤"] = aff["属性"].pop(name)
    def clean(item):
        if isinstance(item, dict):
            return {k: clean(v) for k, v in item.items()}
        if isinstance(item, list):
            return list(dict.fromkeys("全奇术增伤" if k in ["单体类奇术增伤", "群体类奇术增伤"] else k
                                      for k in item if not is_defensive(k)))
        return item
    for key in ["宫槽池", "调律池", "转律池", "稀有池", "防具定音词条"]:
        aff[key] = clean(aff[key])
    for key in list(data["规则"]["转化系数"]):
        if is_defensive(key):
            data["规则"]["转化系数"].pop(key)
    data["规则"].pop("首领防御", None)


def read_excel(path):
    sheets = {}
    with zipfile.ZipFile(path) as archive:
        strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            strings = ["".join(n.itertext()) for n in
                       ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("s:si", NS)]
        relations = {n.attrib["Id"]: n.attrib["Target"] for n in
                     ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
        for sheet in ET.fromstring(archive.read("xl/workbook.xml")).findall("s:sheets/s:sheet", NS):
            rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = relations[rid]
            target = target.lstrip("/") if target.startswith("/") else "xl/" + target
            cells = {}
            for cell in ET.fromstring(archive.read(target)).findall(".//s:sheetData/s:row/s:c", NS):
                kind = cell.attrib.get("t")
                value = cell.find("s:v", NS)
                raw = value.text if value is not None else None
                if kind == "s":
                    raw = strings[int(raw)] if raw is not None else None
                elif kind == "inlineStr":
                    raw = "".join(cell.find("s:is", NS).itertext())
                elif kind not in ("str", "e") and raw is not None:
                    raw = float(raw)
                formula = cell.find("s:f", NS)
                cells[cell.attrib["r"]] = (raw, formula.text if formula is not None else None)
            sheets[sheet.attrib["name"]] = cells
    return sheets


def value(sheet, address):
    raw, formula = sheet.get(address, (None, False))
    if formula and raw is None:
        raise ValueError(f"公式 {address} 没有已保存的计算结果，请重新计算并保存 Excel")
    return raw


def number(sheet, address):
    raw = value(sheet, address)
    if not isinstance(raw, (float, int)):
        raise ValueError(f"{address} 需要数值，实际为 {raw!r}")
    return raw


def equipment_base_stats(sheet):
    """主副武器列是两件合计，拆为单件；环、佩属于武器四件。"""
    result = {}
    for quality, weapon, ring, pendant in [("金色", "E", "F", "G"), ("紫色", "L", "M", "N")]:
        weapon_stats = {"最小外功攻击": number(sheet, f"{weapon}11") / 2,
                        "最大外功攻击": number(sheet, f"{weapon}12") / 2}
        result[quality] = {"主武器": weapon_stats, "副武器": dict(weapon_stats),
                           "环": {"最小外功攻击": number(sheet, f"{ring}11")},
                           "佩": {"最大外功攻击": number(sheet, f"{pendant}12")}}
    return result


def if_number(sheet, address):
    """只读取已知 IF 公式中的数字分支，不执行公式或采用当前选项的缓存。"""
    formula = sheet.get(address, (None, None))[1] or ""
    match = re.search(r",(-?\d+(?:\.\d+)?)(%)?,0\)$", formula)
    if not match:
        raise ValueError(f"{address} 的 IF 布局已变化，请人工更新 JSON：{formula}")
    return float(match[1]) / (100 if match[2] else 1)


def is_percent(name):
    return name.endswith(("率", "加成", "增伤", "增效", "增疗"))


def stat_value(name, raw):
    return round(raw * (100 if is_percent(name) else 1), 6)


def columns(sheet):
    return [(address[:-1], raw) for address, (raw, _) in sheet.items()
            if re.fullmatch(r"[A-Z]+1", address) and address != "A1" and isinstance(raw, str)]


def table_attributes(sheet, column):
    attrs = {}
    for address, (name, _) in sheet.items():
        if re.fullmatch(r"A\d+", address) and isinstance(name, str):
            raw = value(sheet, column + address[1:])
            if isinstance(raw, (int, float)):
                attrs[name] = stat_value(name, raw)
    return attrs


def template_attributes(table, attrs, mapping=None, overrides=None):
    mapping, overrides = mapping or {}, overrides or {}
    result = {}
    for name in attrs:
        field = mapping.get(name, re.sub(r"鸣金|裂石|破竹|牵丝|无相", "属性", name))
        raw = overrides[name] if name in overrides else table.get(field)
        if not isinstance(raw, (int, float)):
            raise ValueError(f"数值总表缺少 {name}（{field}）")
        result[name] = raw
    return result


def heart_attributes(data, name):
    if "属性" in data:  # 首次从旧记录格式迁移
        return data["属性"].get(name, {})
    book = data["心法"][name]
    category = (book.get("品质") or "") + ("通用" if book["归属"] == "通用" else "本流派")
    return template_attributes(data["数值总表"].get(category, {}), book["属性"],
                               book.get("取值"), book.get("数值覆盖"))


def direct_reference(formula):
    if formula and re.fullmatch(r"=?\$?[A-Z]+\$?\d+", formula):
        return formula.lstrip("=").replace("$", "")


def import_record(sheets, data):
    base = data["基础属性"]
    sheet = sheets["随等级成长的基础数据"]
    parts = {"人物与世界等级": {}, "人物天赋": {}, "蹊跷": {}, "装备叠音": {}}
    for row in range(2, 18):
        name = value(sheet, f"A{row}")
        if not name or name in ["判定抗性", "最小属性攻击", "最大属性攻击"]:
            continue
        if name == "首领防御":
            data["规则"]["首领防御"] = number(sheet, f"B{row}")
            continue
        for col, group in [("C", "人物与世界等级"), ("D", "人物天赋"), ("F", "蹊跷"), ("G", "装备叠音")]:
            raw = value(sheet, f"{col}{row}")
            if raw is None:
                continue
            if name == "五维属性":
                parts[group].update({key: raw for key in ["体", "御", "敏", "势", "劲"]})
            elif isinstance(raw, (int, float)):
                parts[group][name] = stat_value(name, raw)
    parts["系统基础"] = {"精准率": 65, "会心伤害加成": 35, "会意伤害加成": 20}
    base["基础来源"] = parts
    base["武库"] = {"最小属性攻击": number(sheet, "E4"), "最大属性攻击": number(sheet, "E5")}
    data["规则"]["判定常量"]["判定抗性"] = number(sheet, "C16")
    # 转化说明是总表的一部分，按其实际数字读取，不继承 DIY 的 0.22。
    conversion = data["规则"]["转化系数"]
    for row, keys in [(7, ["劲转最小攻击", "劲转最大攻击"]),
                      (8, ["势转最大攻击", "势转会意率"]),
                      (9, ["敏转最小攻击", "敏转会心率"]),
                      (10, ["体转气血"]), (11, ["御转气血", "御转防御"])]:
        text = value(sheets["基础数据汇总"], f"H{row}") or ""
        terms = re.findall(r"([\d.]+)(%)?\s*[^+]+", text.split("=", 1)[-1])
        if len(terms) != len(keys):
            raise ValueError(f"基础数据汇总!H{row} 转化说明格式已变化：{text}")
        for key, (raw, _) in zip(keys, terms):
            conversion[key] = float(raw)  # 0.076% 在内部记作 0.076 个百分数点

    # 心法总表和明细保留引用关系。单项攻击、攻击区间是两个不同字段。
    hearts = data["心法"]
    old_attrs = {name: heart_attributes(hearts, name) for name in hearts.get("心法", hearts.get("属性", {}))}
    groups = hearts.get("分组", [])
    owners = {name: book["归属"] for name, book in hearts.get("心法", {}).items()}
    owners.update({n: ("通用" if g["name"] == "通用心法" else g["name"].replace("·", ""))
                   for g in groups for n in g["books"]})
    for group_name, names in [("破竹·樽", ["一醉千秋", "大卷微身", "飞仙醉言", "燕别云岫"]),
                              ("牵丝·翊", ["寸草心"]), ("通用心法", ["四时无常"])]:
        for name in names:
            owners.setdefault(name, "通用" if group_name == "通用心法" else group_name.replace("·", ""))
    sheet = sheets["心法"]
    aliases = {"小外": "最小外功攻击", "大外": "最大外功攻击", "无相攻击下限": "属性攻击下限",
               "无相攻击上限": "属性攻击上限", "小属攻": "最小属性攻击", "大属攻": "最大属性攻击",
               "属攻穿透": "属性穿透", "属攻伤害加成": "属性伤害加成"}
    templates, refs = {}, {}
    for col in ["C", "D", "E", "F", "G"]:
        category = value(sheet, f"{col}34")
        if category not in ["金色本流派", "紫色本流派", "金色通用", "紫色通用", "蓝色通用"]:
            raise ValueError(f"心法!{col}34 未找到品质/归属总表")
        templates[category] = {}
        for row in range(35, 56):
            field = aliases.get(value(sheet, f"B{row}"), value(sheet, f"B{row}"))
            raw = value(sheet, f"{col}{row}")
            if isinstance(raw, (int, float)):
                templates[category][field] = stat_value(field, raw)
                refs[f"{col}{row}"] = (category, field)
    books = {}
    for col, name in columns(sheet):
        name = ALIASES.get(name, name)
        attrs, mapping, overrides, categories = [], {}, {}, set()
        for row in range(2, 31):
            attr = value(sheet, f"A{row}")
            raw, formula = sheet.get(f"{col}{row}", (None, None))
            if raw is None and not formula:
                continue
            ref = direct_reference(formula)
            if ref in refs:
                category, field = refs[ref]
                categories.add(category)
                mapping[attr] = field
            else:
                raw = number(sheet, ref or f"{col}{row}")
                overrides[attr] = stat_value(attr, raw)
            attrs.append(attr)
        if len(categories) > 1:
            raise ValueError(f"心法 {name} 引用了不同品质的总表：{categories}")
        category = next(iter(categories), None)
        old_book = hearts.get("心法", {}).get(name, {})
        owner = owners.get(name, old_book.get("归属", "未记录"))
        if category and category.endswith("通用"):
            owner = "通用"
        book = {"归属": owner, "品质": category[:2] if category else old_book.get("品质"), "属性": attrs}
        mapping = {k: v for k, v in mapping.items() if v != re.sub(r"鸣金|裂石|破竹|牵丝|无相", "属性", k)}
        if mapping:
            book["取值"] = mapping
        if overrides:
            book["数值覆盖"] = overrides
        if not attrs:
            book["说明"] = "记录表未列固定面板加成；品质未记录时留空"
        books[name] = book
    for name, attrs in old_attrs.items():
        if name not in books:
            books[name] = {"归属": owners.get(name, "未记录"), "品质": hearts.get("心法", {}).get(name, {}).get("品质"), "属性": list(attrs),
                           "说明": "记录表未列此心法，沿用旧值"}
            if attrs:
                books[name]["数值覆盖"] = attrs
    hearts.pop("属性", None)
    hearts.pop("分组", None)
    hearts["数值总表"], hearts["心法"] = templates, books

    # 武学天赋总表只记一次数值，各流派选择获得的属性和需求类型。
    sheet = sheets["武学天赋"]
    schools = data["流派"]
    keys = ["最小外功攻击", "最大外功攻击", "会心率", "会意率", "最小属性攻击", "最大属性攻击", "属性穿透", "属性伤害加成"]
    schools["天赋总表"] = {key: stat_value(key, number(sheet, f"C{row}")) for row, key in enumerate(keys, 30)}
    schools["五维需求值"] = number(sheet, "C38")
    unsupported = {}
    for col, full_name in columns(sheet):
        school, variant = full_name[:2], full_name[2:]
        config = schools["流派"].get(school, {}).get(variant)
        if config is None:
            config = {}
            unsupported[full_name] = config
            config["未启用原因"] = "缺少武器、稀有及定音词条池"
            print(f"已记录 {full_name} 的天赋，但未启用配装：缺少武器及词条池")
        attrs, mapping = {}, {}
        for row in range(2, 22):
            attr = value(sheet, f"A{row}")
            raw, formula = sheet.get(f"{col}{row}", (None, None))
            if raw is None and not formula:
                continue
            ref = direct_reference(formula)
            if ref and ref in [f"C{r}" for r in range(30, 38)]:
                field = keys[int(ref[1:]) - 30]
                attrs[attr] = schools["天赋总表"][field]
                if field != re.sub(r"鸣金|裂石|破竹|牵丝", "属性", attr):
                    mapping[attr] = field
            else:
                attrs[attr] = stat_value(attr, number(sheet, f"{col}{row}"))
        config.pop("武学天赋", None)
        config.pop("天赋取值", None)
        config.pop("天赋覆盖", None)
        config["天赋属性"] = list(attrs)
        if mapping:
            config["天赋取值"] = mapping
        overrides = {k: v for k, v in attrs.items() if v != schools["天赋总表"][mapping.get(k, re.sub(r"鸣金|裂石|破竹|牵丝", "属性", k))]}
        if overrides:
            config["天赋覆盖"] = overrides
        dimension = value(sheet, f"{col}22")
        match = re.fullmatch(r"([\d.]+)?([劲敏势体御])", dimension or "")
        if not match:
            raise ValueError(f"{col}22 五维需求应为 敏 或 492敏")
        config["五维需求"] = {"属性": match[2]}
        if match[1]:
            config["五维需求"]["需求值"] = float(match[1])
        text = value(sheet, f"{col}23")
        match = re.fullmatch(r"([\d.]+)(.+)", text or "")
        if not match:
            raise ValueError(f"{col}23 属性需求应如 447最小破竹攻击")
        config["属性需求"] = {"属性": match[2], "需求值": float(match[1])}
        config["本系属性"] = value(sheet, f"{col}24")
    schools["未启用流派"] = unsupported

    sheet = sheets["装备套装"]
    sets = data["套装"]
    keys = ["最小外功攻击", "最大外功攻击", "精准率", "会心率", "会意率"]
    sets["数值总表"] = {key: stat_value(key, number(sheet, f"C{row}")) for row, key in enumerate(keys, 18)}
    bows = {"会心率": ("N4", "弓决会心率"), "精准率": ("O6", "弓决精准率"), "会意率": ("P5", "弓决会意率")}
    for attr, (cell, field) in bows.items():
        sets["数值总表"][field] = stat_value(attr, number(sheet, cell))
    white = {f"C{row}": sum(value(sheet, f"{col}{row}") or 0 for col in ["E", "F", "G"]) for row in [11, 12]}
    refs = {**white, **{f"C{row}": number(sheet, f"C{row}") for row in range(18, 23)}}
    # 套装仅保留额外攻击效果，总表相同的字段直接引用。
    for category, entries in sets["分类"].items():
        for entry in entries:
            if "面板加成" in entry:
                old = entry.pop("面板加成")
                entry["加成属性"] = list(old)
                overrides = {k: v for k, v in old.items() if sets["数值总表"].get(k) != v}
                if overrides:
                    entry["数值覆盖"] = overrides
    extras = {"疾风骤": ("武器", "jifengzhou"), "倾觞": ("武器", "qingshang")}
    for name, (category, key) in extras.items():
        if not any(e["名称"] == name for e in sets["分类"][category]):
            sets["分类"][category].append({"键": key, "名称": name, "加成属性": []})
    for col, name in columns(sheet):
        if col not in list('BCDEFGHIJKLMNOP'):
            continue  # 防具套装不参与本工具的攻击面板
        name = name.replace("弓诀", "弓玦").replace("弓决", "弓玦")
        entry = next((e for entries in sets["分类"].values() for e in entries if e["名称"] == name), None)
        if entry is None:
            raise ValueError(f"未配置套装 {name}，请补充其分类与键")
        attrs = table_attributes(sheet, col)
        if not attrs:  # 空白不能当作已核实的零值
            continue
        if col in ["B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M"]:
            # 已知套装公式只包含白值/额外效果的直接引用或相加。
            for row in range(2, 7):
                attr = value(sheet, f"A{row}")
                formula = sheet.get(f"{col}{row}", (None, None))[1]
                if formula:
                    terms = formula.replace("$", "").lstrip("=").split("+")
                    if not all(term in refs for term in terms):
                        raise ValueError(f"装备套装!{col}{row} 的公式布局已变化：{formula}")
                    attrs[attr] = stat_value(attr, sum(refs[term] for term in terms))
            for attr, cell in [("最小外功攻击", "C11"), ("最大外功攻击", "C12")]:
                attrs[attr] -= white[cell]
        attrs = {k: v for k, v in attrs.items() if abs(v) > 1e-8}
        entry["加成属性"] = list(attrs)
        mapping = {k: bows[k][1] for k in attrs} if name.startswith("弓玦") else {}
        overrides = {k: v for k, v in attrs.items() if sets["数值总表"].get(mapping.get(k, k)) != v}
        entry.pop("取值", None)
        entry.pop("数值覆盖", None)
        if mapping:
            entry["取值"] = mapping
        if overrides:
            entry["数值覆盖"] = overrides
    # 白值由每件装备的品质决定；环、佩同属武器四件，防具没有攻击白值。
    base["基础来源"].pop("武器白值", None)
    base["基础来源"].pop("防具白值", None)
    base["装备基础数值"] = equipment_base_stats(sheet)
    level_text = value(sheets["基础数据汇总"], "A3") or ""
    for label in ["人物等级", "大世界等级"]:
        match = re.search(label + r"[^\d]*(\d+)", level_text)
        if not match:
            raise ValueError(f"基础数据汇总!A3 未记录 {label}")
        base["元数据"][label] = int(match[1])
    sheet = sheets["装备词条"]
    for row in range(2, 24):
        name = value(sheet, f"A{row}")
        names = [name]
        if name in ["最小属性攻击", "最大属性攻击"]:
            names = [name.replace("属性", element) for element in ["鸣金", "裂石", "破竹", "牵丝"]]
        elif name == "指定武学增效":
            names = [key for key in data["装备词条"]["属性"] if "武学" in key and key != "全武学增效"]
        elif name == "防具定音":
            data["装备词条"]["招式定音范围"] = [number(sheet, f"D{row}") * 100, number(sheet, f"B{row}") * 100]
            continue
        elif name in ["单体类奇术增伤", "群体类奇术增伤"]:
            names = ["全奇术增伤"]
        elif name == "全体奇术增伤":
            names = ["全奇术增伤"]
        elif name == "对玩家单位增效":
            names = ["对玩家单位增伤"]
        for key in names:
            item = data["装备词条"]["属性"].get(key)
            if item:
                item["范围"] = [stat_value(key, number(sheet, f"D{row}")), stat_value(key, number(sheet, f"B{row}"))]
                raw = value(sheet, f"C{row}")
                if raw is not None:
                    item["承音值"] = stat_value(key, raw)
                else:
                    item.pop("承音值", None)


def import_diy(sheets, data):
    sheet = sheets["DIY"]
    base = data["基础属性"]
    # B4/B5 已含装备白值和叠音；拆出金色白值后才能按单件品质替换。
    current = {}
    for part in base["基础来源"].values():
        for key, raw in part.items():
            current[key] = current.get(key, 0) + raw
    current.update({"最小外功攻击": number(sheet, "B4"), "最大外功攻击": number(sheet, "B5"),
                    "精准率": number(sheet, "B6") * 100, "会心率": number(sheet, "B7") * 100,
                    "会意率": number(sheet, "B10") * 100, "会心伤害加成": number(sheet, "B9") * 100,
                    "会意伤害加成": number(sheet, "B12") * 100,
                    "最小无相攻击": number(sheet, "B21"), "最大无相攻击": number(sheet, "B22"),
                    "劲": number(sheet, "B23"), "敏": number(sheet, "B24"), "势": number(sheet, "B25")})
    for part in base["装备基础数值"]["金色"].values():
        for key, raw in part.items():
            current[key] -= raw
    base["基础来源"] = {"DIY基础白值（已含叠音，不含装备白值）": current}
    base["武库"] = {"最小属性攻击": if_number(sheet, "G11"), "最大属性攻击": if_number(sheet, "H11")}
    data["规则"]["判定常量"]["判定抗性"] = number(sheet, "B1") - 1
    data["规则"]["增益抗性"] = number(sheet, "D1") - 1
    formula = sheet.get("D4", (None, None))[1] or ""
    match = re.search(r"D23\*([\d.]+)", formula)
    if not match:
        raise ValueError("DIY!D4 的劲转攻击公式已变化，请人工核对")
    data["规则"]["转化系数"]["劲转最小攻击"] = float(match[1])
    headers = {"小外": "最小外功攻击", "大外": "最大外功攻击", "精准": "精准率", "会心": "会心率",
               "直接会心": "直接会心率", "会意": "会意率", "直接会意": "直接会意率",
               "外功伤害": "外功伤害加成", "会心伤害": "会心伤害加成", "会意伤害": "会意伤害加成"}
    for row in range(3, 41):
        name = value(sheets["心法"], f"A{row}")
        if not name:
            continue
        name = ALIASES.get(name, name)
        attrs = {}
        for col, label in columns(sheets["心法"]):
            key = headers.get(label, label + "攻击" if label.startswith(("最小", "最大")) else label)
            if key.endswith("加成") and key[:2] in ["鸣金", "裂石", "破竹", "牵丝"]:
                key = key[:2] + "伤害加成"
            raw = value(sheets["心法"], f"{col}{row}")
            if isinstance(raw, (int, float)):
                attrs[key] = stat_value(key, raw)
        # DIY 缺少的心法属性沿用原值，明确存在的数值覆盖。
        hearts = data["心法"]
        if "心法" not in hearts:
            raise ValueError("请先从当前基础数值记录表建立数值总表")
        old = heart_attributes(hearts, name) if name in hearts["心法"] else {}
        old.update(attrs)
        book = hearts["心法"].setdefault(name, {"归属": "未记录", "品质": None})
        book["属性"] = list(old)
        book["数值覆盖"] = old
        book["说明"] = "DIY参考表逐项覆盖；重新同步记录表会恢复总表引用"
    sheet = sheets["武学天赋"]
    for row in range(2, 12):
        name = value(sheet, f"A{row}")
        if not name:
            continue
        config = data["流派"]["流派"].get(name[:2], {}).get(name[2:])
        if config is None:
            print(f"未接入流派 {name}：缺武器/定音池等信息，本次仅保留已支持流派")
            continue
        for col, label in columns(sheet):
            if label in ["属性需求", "本系属性"]:
                continue
            key = label + "攻击" if label.startswith(("最小", "最大")) else label
            raw = value(sheet, f"{col}{row}")
            if isinstance(raw, (int, float)):
                config.setdefault("天赋覆盖", {})[key] = stat_value(key, raw)
                if key not in config["天赋属性"]:
                    config["天赋属性"].append(key)
        config["五维需求"]["需求值"] = number(sheets["DIY"], "H14")
    bows = {"gongJueYinyu": {"精准率": stat_value("精准率", if_number(sheets["DIY"], "S8"))},
            "gongJueJingxian": {"会心率": stat_value("会心率", if_number(sheets["DIY"], "S9"))},
            "gongJueZhuiying": {"会意率": stat_value("会意率", if_number(sheets["DIY"], "S10"))}}
    for entry in data["套装"]["分类"]["弓决"]:
        entry["加成属性"] = list(bows[entry["键"]])
        entry["数值覆盖"] = bows[entry["键"]]
    for entry in data["套装"]["分类"]["武器"]:
        key = entry["键"]
        attrs = {}
        if key in ["yangui", "hantian", "lianxing", "caiyun", "duanyue"]:
            attrs["最小外功攻击"] = if_number(sheets["DIY"], "T6")
        if key == "yudou":
            attrs["最大外功攻击"] = if_number(sheets["DIY"], "T7")
        if key in ["shiyu", "yanliu"]:
            attrs["精准率"] = stat_value("精准率", if_number(sheets["DIY"], "T8"))
        if key == "shiyu":
            attrs["会心伤害加成"] = stat_value("会心伤害加成", if_number(sheets["DIY"], "D9"))
        if key == "huanhua":
            attrs["会心率"] = stat_value("会心率", if_number(sheets["DIY"], "T9"))
        if key == "feisun":
            attrs["会意率"] = stat_value("会意率", if_number(sheets["DIY"], "T10"))
        if key in ["jifengzhou", "qingshang"]:
            continue  # DIY未列的新套装保留记录表数据
        entry["加成属性"] = list(attrs)
        entry["数值覆盖"] = attrs
    refs = sheets["DIY"]
    for row in range(3, 25):
        label = value(refs, f"W{row}")
        name = {"最小外攻": "最小外功攻击", "最大外攻": "最大外功攻击", "首领增": "对首领单位增伤",
                "奇术增伤": "全奇术增伤", "全武增": "全武学增效"}.get(label, label)
        names = [name]
        if label == "武学增伤":
            names = [key for key in data["装备词条"]["属性"] if "武学" in key and key != "全武学增效"]
        elif label == "奇术增伤":
            names = ["全奇术增伤"]
        elif label and label.startswith(("最小", "最大")) and label not in ["最小外攻", "最大外攻"]:
            names = [label + "攻击"]
        for key in names:
            item = data["装备词条"]["属性"].get(key)
            if item:
                maximum = stat_value(key, number(refs, f"X{row}"))
                item["范围"] = [maximum / 2, maximum]
                item["承音值"] = stat_value(key, number(refs, f"Y{row}"))


def differences(before, after, prefix=""):
    if isinstance(before, dict) and isinstance(after, dict):
        for key in dict.fromkeys([*before, *after]):
            yield from differences(before.get(key), after.get(key), f"{prefix}/{key}")
    elif before != after:
        yield f"{prefix}: {before} → {after}"


def readable_numbers(item):
    if isinstance(item, dict):
        return {key: readable_numbers(raw) for key, raw in item.items()}
    if isinstance(item, list):
        return [readable_numbers(raw) for raw in item]
    return round(item, 6) if isinstance(item, float) else item


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--source", choices=["diy", "record"], default="record")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--world-level", type=int, help="覆盖表头中的大世界等级，仅更新版本信息")
    parser.add_argument("--season", help="当前赛季名称，仅更新版本信息")
    args = parser.parse_args()
    data = {path.stem: json.loads(path.read_text(encoding="utf-8")) for path in DATA.glob("*.json")}
    before = copy.deepcopy(data)
    sheets = read_excel(args.file)
    (import_diy if args.source == "diy" else import_record)(sheets, data)
    offensive_data(data)
    for entry in data.values():
        entry["元数据"].update({"来源": args.file.name, "优先来源": args.file.name,
                                 "缺项": "保留有明确来源的旧值并单独说明",
                                 "公式读取": "总表与已知直接引用；其他公式读取已保存的计算结果"})
    data = readable_numbers(data)
    metadata = data["规则"]["元数据"]
    if args.world_level is not None:
        data["基础属性"]["元数据"]["大世界等级"] = args.world_level
    if args.season:
        metadata["赛季"] = args.season
    if before["规则"]["元数据"].get("优先来源") != args.file.name:
        metadata["数据版本"] = args.file.stem
    if args.source == "record":
        metadata["更新日期"] = date.today().isoformat()
        metadata["数据版本"] = f"人物{data['基础属性']['元数据']['人物等级']}级 / 世界{data['基础属性']['元数据']['大世界等级']}级 · {metadata.get('赛季', '基础数值记录')}"
        metadata["基础攻击口径"] = "成长、天赋、蹊跷、叠音与装备白值分别累加；武器套装只加额外效果"
        metadata["缺项说明"] = ["本工具只记录攻击与增伤属性，不计算防御、气血、体御及防具套装加成",
                              "增益抗性沿用旧值；词条池参考母项目，冠胄与胸甲神力已合并为全奇术增伤",
                              "未列心法保留并标注；无固定面板加成且未记品质的心法不猜测品质",
                              "破竹樽已接入拳甲、双刀与倾觞；防具定音暂仅记录悬身断水·浓醺技能增伤",
                              "心法的本流派表示专属归属；换流派装备该心法不会自动改变其品质数值"]
        data["装备词条"]["元数据"]["说明"] = "范围与承音采用记录表最后一页；保留攻击属性及牵丝霖的明川药典·治疗技增疗定音。冠胄、胸甲神力统一为全奇术增伤。"
    else:
        metadata["基础攻击口径"] = "DIY 基础攻击拆出装备白值，按单件品质加回；保留叠音；武器套装只加额外效果；默认本系武库"
    for line in differences(before, data):
        print(line)
    if args.write:
        for name, entry in data.items():
            (DATA / f"{name}.json").write_text(json.dumps(entry, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("已更新中文 JSON；原 Excel 未修改。")
    else:
        print("仅查看差异。加 --write 才会更新 JSON。")


if __name__ == "__main__":
    main()
