function tidy_code(code, is_python=false) {
    const arr = code.split('\n');
    const ret = [];
    const indent_num = 4;
    let indent_level = 0;
    for (let i = 0, len = arr.length; i < len; ++ i) {
        if (!(0 === arr[i].trim().length)) {

            if (is_python) {
                // python def前两个空行
                const trimRighted = arr[i].trimRight();
                if (/^def /.test(trimRighted) || /^if /.test(trimRighted)) {
                    ret.push('\n');
                }
                ret.push(trimRighted);
            }
            else {

                const trimed = arr[i].trim();
                if (trimed.startsWith('}') || trimed.endsWith('}')) {
                    indent_level -= 1;
                }

                ret.push(' '.repeat(Math.max(0, indent_level) * indent_num) + trimed);

                if (trimed.startsWith('{') || trimed.endsWith('{')) {
                    indent_level += 1;
                }

                // c/nodejs 大括号后换行
                if (/^\}(\s+)?;?$/.test(trimed)) {
                    ret.push('');
                }
            }
        }
    }
    return ret.join('\n');
}

module.exports = tidy_code;