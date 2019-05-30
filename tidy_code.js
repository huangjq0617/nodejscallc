function tidy_code(code, is_python=false) {
    const arr = code.split('\n');
    const ret = [];
    for (let i = 0, len = arr.length; i < len; ++ i) {
        if (!(0 === arr[i].trim().length)) {
            ret.push(arr[i].replace(/\n/g, ''));

            if (is_python) {
                // python def前两个空行
                if (/^def /.test(arr[i].trimRight()) || /^if /.test(arr[i].trimRight())) {
                    ret.splice(ret.length-1, 0, '\n');
                }
            }
            else {
                // c/nodejs 大括号后换行
                if (/^\}(\s+)?;?$/.test(arr[i].trimRight())) {
                    ret.push('');
                }
            }
        }
    }
    return ret.join('\n');
}

module.exports = tidy_code;