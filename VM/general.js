class AWASM {

  constructor() {
    this.R = new Int32Array(8);
    this.stack = [];
    this.macros = [];
  }

  async initiate(file, opts = {}) {

    const res = await fetch(file);
    const buf = await res.arrayBuffer();
    const data = new Int32Array(buf);

    this.macros = this.parse(data);

    if (opts.autorun) {
      this.run(0);
    }
  }

  parse(data) {

    let ip = 0;
    const macroCount = data[ip++];

    const macros = [];

    for (let m = 0; m < macroCount; m++) {

      const size = data[ip++];

      const ops = [];

      const start = ip;
      const end = ip + size;

      while (ip < end) {

        const op = data[ip++];

        switch (op) {

          case 1: {
            const r = data[ip++];
            const v = data[ip++];
            ops.push(`R[${r}] = ${v};`);
            break;
          }

          case 2: {
            const r = data[ip++];
            const a = data[ip++];
            const b = data[ip++];
            ops.push(`R[${r}] = R[${a}] + R[${b}];`);
            break;
          }
            
          case 3: {
            const r = data[ip++];
            const a = data[ip++];
            const b = data[ip++];
            ops.push(`R[${r}] = R[${a}] - R[${b}];`);
            break;
          }

          case 4: {
            const r = data[ip++];
            const a = data[ip++];
            const b = data[ip++];
            ops.push(`R[${r}] = R[${a}] * R[${b}];`);
            break;
          }

          case 5: {
            const r = data[ip++];
            const a = data[ip++];
            const b = data[ip++];
            ops.push(`R[${r}] = R[${a}] / R[${b}];`);
            break;
          }

          case 8: {
            const a = data[ip++];
            const b = data[ip++];
            ops.push(`R[0] = (R[${a}] === R[${b}]) ? 1 : 0;`);
            break;
          }

          case 9: {
            const target = data[ip++];
            ops.push(`return macros[${target}](R, stack, macros);`);
            break;
          }

          case 13: {
            const id = data[ip++];
            ops.push(`this.syslog(${id});`);
            break;
          }

          case 14: {
            const r = data[ip++];
            ops.push(`return R[${r}];`);
            break;
          }

          case 255: {
            ops.push(`return;`);
            break;
          }
        }
      }

      const fn = new Function("R", "stack", "macros", `
        ${ops.join("\n")}
      `).bind(this);

      macros.push(fn);
    }

    return macros;
  }

  run(index = 0) {
    return this.macros[index](this.R, this.stack, this.macros);
  }

  syslog(id) {

    switch (id) {

      case 6:
        localStorage.setItem("key", "value");
        break;

      case 7:
        this.R[0] = parseInt(localStorage.getItem("key") || "0");
        break;

      case 8:
        localStorage.clear();
        break;

      default:
        console.warn("Unknown SYSLOG:", id);
    }
  }
  
  getMacro(i) {
    return this.macros[i];
  }

  getMacroAs(i) {
    return (...args) => this.macros[i](this.R, this.stack, this.macros, ...args);
  }
}
