const tidy_code = require('./tidy_code');

function generate_deserialization_code(params) {
    return params.map((param, index) => {
        const {name, type} = param;
        if (type === 'int32') {
            return `
        int32_t ${name} = *((int32_t *)&inBuf[offset]);
        offset += WORD_SIZE;`;
        } else if (type === 'float') {
            return `
        float ${name} = *((float *)&inBuf[offset]);
        offset += WORD_SIZE;`;
        } else if (type === 'string' || type === 'buffer') {
            return `
        int32_t len_${index} = *((int32_t *)&inBuf[offset]);
        offset += WORD_SIZE;
        std::string ${name}(&inBuf[offset], len_${index});
        offset += len_${index};`;
        } else if (type === 'vector_string') {
            return `
        int32_t vector_cnt_${index} = *((int32_t *)&inBuf[offset]);
        offset += WORD_SIZE;
        int32_t vector_len_${index} = *((int32_t *)&inBuf[offset]);
        offset += WORD_SIZE;
        int32_t vector_buff_start_${index} = offset;
        std::vector<std::string> ${name};
        ${name}.reserve(vector_cnt_${index});
        for (int32_t i = 0; i < vector_cnt_${index}; ++ i) {
            int32_t _v_len_${index} = *((int32_t *)&inBuf[offset]);
            ${name}.push_back(std::string(&inBuf[offset+WORD_SIZE], _v_len_${index}));
            offset += WORD_SIZE + _v_len_${index};
        }
        if (vector_buff_start_${index} + vector_len_${index} != offset) {
            dbg_log("vector_buff_start_${index} + vector_len_${index} != offset");
            break;
        }`;
        } else if (type === 'vector_int32') {
            return `
        int32_t vector_cnt_${index} = *((int32_t *)&inBuf[offset]);
        offset += WORD_SIZE;
        std::vector<int32_t> ${name};
        ${name}.reserve(vector_cnt_${index});
        for (int32_t i = 0; i < vector_cnt_${index}; ++ i) {
            ${name}.push_back(*((int32_t *)&inBuf[offset + i * WORD_SIZE]));
        }
        offset += vector_cnt_${index} * WORD_SIZE;`;
        } else if (type === 'vector_float') {
            return `
        int32_t vector_cnt_${index} = *((int32_t *)&inBuf[offset]);
        offset += WORD_SIZE;
        std::vector<float> ${name};
        ${name}.reserve(vector_cnt_${index});
        for (int32_t i = 0; i < vector_cnt_${index}; ++ i) {
            ${name}.push_back(*((float *)&inBuf[offset + i * WORD_SIZE]));
        }
        offset += vector_cnt_${index} * WORD_SIZE;`;
        } else {
            throw new Error(`type '${type}' not supported.`);
        }
    }).join('');
}

function generate_params_str_list(req_params, rsp_params) {
    const req_params_str_list = req_params.map((param) => {
        const {name, type} = param;
        if (type === 'int32') {
            return `int32_t ${name}`;
        } else if (type === 'float') {
            return `float ${name}`;
        } else if (type === 'string' || type === 'buffer') {
            return `const std::string & ${name}`;
        } else if (type === 'vector_string') {
            return `const std::vector<std::string> & ${name}`;
        } else if (type === 'vector_int32') {
            return `const std::vector<int32_t> & ${name}`;
        } else if (type === 'vector_float') {
            return `const std::vector<float> & ${name}`;
        } else {
            throw new Error(`type '${type}' not supported.`);
        }
    });
    const rsp_params_str_list = rsp_params.map((param) => {
        const {name, type} = param;
        if (type === 'int32') {
            return `int32_t & ${name}`;
        } else if (type === 'float') {
            return `float & ${name}`;
        } else if (type === 'string') {
            return `std::string & ${name}`;
        } else if (type === 'vector_string') {
            return `std::vector<std::string> & ${name}`;
        } else if (type === 'vector_int32') {
            return `std::vector<int32_t> & ${name}`;
        } else if (type === 'vector_float') {
            return `std::vector<float> & ${name}`;
        } else {
            throw new Error(`type '${type}' not supported.`);
        }
    });
    return req_params_str_list.concat(rsp_params_str_list).join(', ');
}

function generate_def_code_without_body(func_name, req_params, rsp_params)
{
    return `void ${func_name}(${generate_params_str_list(req_params, rsp_params)})`;
}

function generate_def_codes_without_body(functions)
{
    const def_str_list = functions.map((func) => {
        const {func_name, req_params, rsp_params} = func;

        return `
${generate_def_code_without_body(func_name, req_params, rsp_params)};
        `;
    });

    return def_str_list.join('');
}

function generate_def_codes(functions)
{
    const def_str_list = functions.map((func) => {
        const {func_name, req_params, rsp_params} = func;

        return `
${generate_def_code_without_body(func_name, req_params, rsp_params)}
{
    // TODO:
}
`;
    });

    return def_str_list.join('');
}

function generate_call_code(func_name, req_params, rsp_params, with_try_catch=false)
{
    const param_str = req_params.concat(rsp_params).map(param => param.name).join(', ');
    if (with_try_catch) {
        return `
            int32_t error_code = 0;
            try {
                ${func_name}(${param_str});
            }
            catch (std::exception& e) {
                dbg_log("Error in Cpp: ");
                dbg_log(e.what());
                error_code = -1;
            }
            rsp_buffer.append((const char*)&error_code, WORD_SIZE);
        `;
    }
    else {
        return `${func_name}(${param_str});`;
    }
}

function generate_rsp_params_def_code(rsp_params)
{
    return rsp_params.map((param) => {
        const {name, type} = param;
        if (type === 'int32') {
            return `
            int32_t ${name};
            `;
        } else if (type === 'float') {
            return `
            float ${name};
            `;
        } else if (type === 'string') {
            return `
            std::string ${name};
            `;
        } else if (type === 'vector_string') {
            return `
            std::vector<std::string> ${name};
            `;
        } else if (type === 'vector_int32') {
            return `
            std::vector<int32_t> ${name};
            `
        } else if (type === 'vector_float') {
            return `
            std::vector<float> ${name};
            `
        } else {
            throw new Error(`type '${type}' not supported.`);
        }
    }).join('\n');
}

function generate_rsp_code(rsp_params)
{
    return rsp_params.map((param, index) => {
        const {name, type} = param;
        if (type === 'int32') {
            return `
            rsp_buffer.append(reinterpret_cast<const char *>(&${name}), 4);
            `;
        } else if (type === 'float') {
            return `
            rsp_buffer.append(reinterpret_cast<const char *>(&${name}), 4);
            `;
        } else if (type === 'string') {
            return `
            int32_t str_len_${index} = ${name}.length();
            rsp_buffer.append(reinterpret_cast<const char *>(&str_len_${index}), 4);
            rsp_buffer.append(${name}.c_str(), str_len_${index});
            `;
        } else if (type === 'vector_string') {
            return `
            int32_t v_cnt_${index} = ${name}.size();
            rsp_buffer.append(reinterpret_cast<const char *>(&v_cnt_${index}), 4);
            int32_t total_len_${index} = ${name}.size() * 4;
            for (size_t i = 0, len = ${name}.size(); i < len; ++ i) {
                total_len_${index} += ${name}[i].length();
            }
            rsp_buffer.append(reinterpret_cast<const char *>(&total_len_${index}), 4);
            for (size_t i = 0, len = ${name}.size(); i < len; ++ i) {
                int32_t tmp_len = (int32_t)${name}[i].length();
                rsp_buffer.append(reinterpret_cast<const char *>(&tmp_len), 4);
                rsp_buffer.append(${name}[i].c_str(), ${name}[i].length());
            }
        `;
        } else if (type === 'vector_int32') {
            return `
            int32_t v_cnt_${index} = ${name}.size();
            rsp_buffer.append(reinterpret_cast<const char *>(&v_cnt_${index}), 4);
            for (size_t i = 0, len = ${name}.size(); i < len; ++ i) {
                rsp_buffer.append(reinterpret_cast<const char *>(&${name}[i]), 4);
            }
            `;
        } else if (type === 'vector_float') {
            return `
            int32_t v_cnt_${index} = ${name}.size();
            rsp_buffer.append(reinterpret_cast<const char *>(&v_cnt_${index}), 4);
            for (size_t i = 0, len = ${name}.size(); i < len; ++ i) {
                rsp_buffer.append(reinterpret_cast<const char *>(&${name}[i]), 4);
            }
            `;
        } else {
            throw new Error(`type '${type}' not supported.`);
        }
    }).join('\n');
}

function generate_call_codes(functions) {

    const call_str_list = functions.map((func, index) => {
        const {func_name, req_params, rsp_params} = func;
        const deserialization_code_with_less_indent = generate_deserialization_code(req_params);
        const deserialization_code = deserialization_code_with_less_indent.replace(/[ ]{8}/g, ' '.repeat(12));
        const rsp_params_def_code = generate_rsp_params_def_code(rsp_params);
        const call_code = generate_call_code(func_name, req_params, rsp_params, true);
        const rsp_code = generate_rsp_code(rsp_params);

        if (index === 0) {
            return `
        if (func_index == ${index}) {
            ${deserialization_code}
            ${rsp_params_def_code}
            ${call_code}
            if (error_code == 0) {
                ${rsp_code}
            }
        }
            `;
        }
        else {
            return `
        else if (func_index == ${index}) {
            ${deserialization_code}
            ${rsp_params_def_code}
            ${call_code}
            if (error_code == 0) {
                ${rsp_code}
            }            
        }
            `;
        }
    });

    return call_str_list.join('');
}

function generate_initialization_args(init_params) {
    return generate_params_str_list(init_params, []);
}

function generate_c(class_name, init_params, functions, desc, version)
{
    const def_code = generate_def_codes(functions);
    const initialization_args = generate_initialization_args(init_params);
    const init_deserialization_code = generate_deserialization_code(init_params);
    const init_call_code = generate_call_code("initialize", init_params, []);
    const call_code = generate_call_codes(functions);

    const comment = `// **********************************************************************
// This file was generated by a NodejsCallC parser!
// NodejsCallC version ${version} by liwang112358@gmail.com
// Generated from ${desc} at ${(new Date()).toString()}
// **********************************************************************`;
    const c_imp_code = `${comment}
#include "${class_name}_header.h"
${def_code}`;
    const c_init_code = `${comment}
#include "${class_name}_header.h"
void initialize(${initialization_args})
{
    // TODO initialize
}`;
    const c_header_code = `${comment}
#ifndef ${class_name.toUpperCase()}_H
#define ${class_name.toUpperCase()}_H
#include <stdint.h>
#include <unistd.h>
#include <string>
#include <vector>
#include <sstream>
#include <iostream>
#include <cstdlib>
#include <cstring>
const int WORD_SIZE = 4;
void dbg_log(const std::string & msg);
void initialize(${initialization_args});
${generate_def_codes_without_body(functions)}
#endif
`;
    const c_pipe_code = `${comment}
#include "${class_name}_header.h"
#include <cassert>
#include <exception>

int fd0 = 0;
int fd1 = 0;

int readed(int fd, char* read_buffer, int length)
{
    int recv_len = 0;
    while (recv_len < length) {
        int read_size = read(fd, read_buffer + recv_len, length - recv_len);
        if (read_size <= 0) {
            break;
        }
        recv_len += read_size;
    }
    return recv_len;
}

int written(int fd, const char* write_buffer, int length)
{
    int send_len = 0;
    while (send_len < length) {
        int write_size = write(fd, write_buffer + send_len, length - send_len);
        if (write_size <= 0) {
            break;
        }
        send_len += write_size;
    }
    return send_len;
}

void dbg_log(const std::string & msg)
{
    int32_t type = 1;
    int32_t sid = 0;
    int32_t buffer_len = msg.length();

    std::string outBuf;
    outBuf.append(reinterpret_cast<const char *>(&type), WORD_SIZE);
    outBuf.append(reinterpret_cast<const char *>(&sid), WORD_SIZE);
    outBuf.append(reinterpret_cast<const char *>(&buffer_len), WORD_SIZE);
    outBuf.append(msg);

    written(fd1, outBuf.c_str(), outBuf.size());
}

void ready()
{
    int32_t type = 2;
    int32_t sid = 0;
    int32_t buffer_len = 1;

    std::string outBuf;
    outBuf.append(reinterpret_cast<const char *>(&type), WORD_SIZE);
    outBuf.append(reinterpret_cast<const char *>(&sid), WORD_SIZE);
    outBuf.append(reinterpret_cast<const char *>(&buffer_len), WORD_SIZE);
    outBuf.append(" ");

    written(fd1, outBuf.c_str(), outBuf.size());
}

int main()
{
    fd0 = dup(0);
    fd1 = dup(1);
    close(0);
    close(1);
    bool initialized = false;
    assert(sizeof(int32_t) == WORD_SIZE);
    assert(sizeof(float) == WORD_SIZE);
    while (true)
    {
        int32_t buf_len = 0;
        int32_t read_size = readed(fd0, reinterpret_cast<char *>(&buf_len), WORD_SIZE);
        if (read_size <= 0) {
            break;
        }
        
        std::vector<char> inBuf(buf_len);
        read_size = readed(fd0, &inBuf[0], buf_len);
        if (read_size <= 0) {
            break;
        }

        int32_t offset = 0;
        
        ${init_deserialization_code}
        ${init_call_code}
        ready();
        initialized = true;
        break;
    }

    if (!initialized) {
        dbg_log("initialize failed.");
        exit(-1);
    }
    
    while (true) {
        int32_t buf_len = 0;
        int32_t read_size = readed(fd0, reinterpret_cast<char *>(&buf_len), 4);
        if (read_size <= 0) {
            break;
        }
        
        std::vector<char> inBuf(buf_len);
        read_size = readed(fd0, &inBuf[0], buf_len);
        if (read_size <= 0) {
            break;
        }

        int32_t offset = 0;

        int32_t sid = *((int32_t *)&inBuf[offset]);
        offset += WORD_SIZE;

        int32_t func_index = *((int32_t *)&inBuf[offset]);
        offset += WORD_SIZE;
        
        std::string rsp_header;
        int32_t type = 0;
        rsp_header.append(reinterpret_cast<const char *>(&type), WORD_SIZE);
        rsp_header.append(reinterpret_cast<const char *>(&sid), WORD_SIZE);
        std::string rsp_buffer;
        rsp_buffer.append(reinterpret_cast<const char *>(&func_index), WORD_SIZE);

        ${call_code}

        int32_t rsp_buffer_len = rsp_buffer.size();
        rsp_header.append(reinterpret_cast<const char *>(&rsp_buffer_len), WORD_SIZE);
        written(fd1, rsp_header.c_str(), rsp_header.size());
        written(fd1, rsp_buffer.c_str(), rsp_buffer_len);
    }
    return 0;
}
`;
    return {
        c_imp_code: tidy_code(c_imp_code),
        c_init_code: tidy_code(c_init_code),
        c_header_code: tidy_code(c_header_code),
        c_pipe_code: tidy_code(c_pipe_code),
    } ;
}

module.exports = generate_c;
