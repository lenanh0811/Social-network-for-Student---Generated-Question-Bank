/**
 * Bộ kiểm tra dữ liệu theo OpenAPI/Swagger (phần cần dùng): kiểu, bắt buộc, enum, khoảng số, mảng, object lồng nhau, $ref.
 * Trả về danh sách lỗi (rỗng = hợp lệ). Trường lạ (không có trong Swagger) bị coi là lỗi khi `strict` = true.
 */
export function createValidator(spec) {
  const deref = (s) => { while (s && s.$ref) s = spec.components.schemas[s.$ref.split('/').pop()]; return s; };

  function check(schema, value, at, errors, strict) {
    schema = deref(schema);
    if (!schema || value === undefined || value === null) return errors;
    for (const part of schema.allOf ?? []) check(part, value, at, errors, strict);
    if (schema.enum && !schema.enum.includes(value)) errors.push(`${at}: "${value}" không thuộc [${schema.enum.join(', ')}]`);
    const type = schema.type ?? (schema.properties ? 'object' : undefined);
    if (type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value)) return errors.concat(`${at}: phải là object`);
      for (const r of schema.required ?? []) if (value[r] === undefined || value[r] === null) errors.push(`${at}.${r}: bắt buộc nhưng thiếu`);
      const props = schema.properties ?? {};
      for (const [k, v] of Object.entries(value)) {
        if (props[k]) check(props[k], v, `${at}.${k}`, errors, strict);
        else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') check(schema.additionalProperties, v, `${at}.${k}`, errors, strict);
        else if (strict && schema.properties) errors.push(`${at}.${k}: trường này không có trong Swagger`);
      }
    } else if (type === 'array') {
      if (!Array.isArray(value)) return errors.concat(`${at}: phải là mảng`);
      value.forEach((v, i) => check(schema.items, v, `${at}[${i}]`, errors, strict));
    } else if (type === 'integer') {
      if (!Number.isInteger(value)) errors.push(`${at}: phải là số nguyên (đang là ${JSON.stringify(value)})`);
    } else if (type === 'number') {
      if (typeof value !== 'number') errors.push(`${at}: phải là số`);
    } else if (type === 'string') {
      if (typeof value !== 'string') errors.push(`${at}: phải là chuỗi (đang là ${JSON.stringify(value)})`);
    } else if (type === 'boolean') {
      if (typeof value !== 'boolean') errors.push(`${at}: phải là true/false`);
    }
    if ((type === 'integer' || type === 'number') && typeof value === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${at}: ${value} nhỏ hơn mức tối thiểu ${schema.minimum}`);
      if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${at}: ${value} lớn hơn mức tối đa ${schema.maximum}`);
    }
    return errors;
  }

  /** Tìm đường dẫn Swagger khớp với đường dẫn thật (vd. /sessions/5/questions → /sessions/{sessionId}/questions). */
  function match(method, urlPath) {
    let best;
    for (const [tpl, item] of Object.entries(spec.paths)) {
      const re = new RegExp('^' + tpl.replace(/\{[^}]+\}/g, '([^/]+)') + '$');
      const m = urlPath.match(re);
      if (m && item[method.toLowerCase()]) {
        const names = [...tpl.matchAll(/\{([^}]+)\}/g)].map((x) => x[1]);
        const literal = tpl.replace(/\{[^}]+\}/g, '').length; // đường dẫn có nhiều phần cố định hơn thì khớp hơn
        if (!best || literal > best.literal) best = { literal, template: tpl, op: item[method.toLowerCase()], params: Object.fromEntries(names.map((n, i) => [n, m[i + 1]])) };
      }
    }
    return best;
  }

  const bodySchema = (op) => op.requestBody && Object.values(op.requestBody.content ?? {})[0]?.schema;
  const okSchema = (op) => {
    const r = Object.entries(op.responses ?? {}).find(([c]) => c.startsWith('2'));
    return r && Object.values(r[1].content ?? {})[0]?.schema;
  };

  return {
    match,
    /** Kiểm tra một yêu cầu gửi lên: tham số đường dẫn, query và body. */
    checkRequest(found, query, body) {
      const errors = [];
      const declared = new Map((found.op.parameters ?? []).map((p) => [`${p.in}:${p.name}`, p]));
      for (const [k, v] of Object.entries(query)) {
        const p = declared.get(`query:${k}`);
        if (!p) errors.push(`query.${k}: tham số này không có trong Swagger`);
        else check(p.schema, p.schema?.type === 'integer' || p.schema?.type === 'number' ? Number(v) : p.schema?.type === 'boolean' ? v === 'true' : v, `query.${k}`, errors, true);
      }
      for (const p of declared.values()) if (p.in === 'query' && p.required && query[p.name] === undefined) errors.push(`query.${p.name}: bắt buộc nhưng thiếu`);
      const bs = bodySchema(found.op);
      if (bs) {
        if (body === undefined) errors.push('body: bắt buộc nhưng thiếu');
        else check(bs, body, 'body', errors, true);
      } else if (body !== undefined) errors.push('body: API này không nhận body');
      return errors;
    },
    /** Kiểm tra phản hồi giả của chính mock server có đúng Swagger không (để dữ liệu thử nghiệm sát thực tế). */
    checkResponse(found, payload) {
      const s = okSchema(found.op);
      return s ? check(s, payload, 'response', [], true) : [];
    },
  };
}
