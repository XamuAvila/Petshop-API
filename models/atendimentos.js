const { default: axios } = require('axios');
const { response } = require('express');
const moment = require('moment');
const { restart } = require('nodemon');
const conexao = require('../infraestrutura/database/conexao')
const repositorio = require('../repositorios/atendimento')
class Atendimento {
    constructor() {
        this.dataEhValida = ({ data, dataCriacao }) =>
            moment(data).isSameOrAfter(dataCriacao)
        this.clienteEhValido = tamanho => tamanho.tamanho >= 5

        this.valida = parametros =>
            this.validacoes.filter(campo => {
                const { nome } = campo
                const parametro = parametros[nome]
                const campoValido = campo.valido(parametro) == 1 
                return campoValido ? false : campo
            })

        this.validacoes = [
            {
                nome: 'data',
                valido: this.dataEhValida,
                mensagem: 'Data deve ser maior ou igual a data atual'
            },
            {
                nome: 'cliente',
                valido: this.clienteEhValido,
                mensagem: 'Cliente deve ter pelo menos cinco caracteres'
            }
        ]
    }
    adiciona(atendimento) {
        const dataCriacao = moment().format('YYYY-MM-DD HH:mm:ss');
        const data = moment(atendimento.data, 'DD/MM/YYYY').format('YYYY-MM-DD HH:mm:ss')
        const parametros = {
            data: { data, dataCriacao },
            cliente: { tamanho: atendimento.cliente.length }
        }
        const erros = this.valida(parametros);
        const existemErros = erros.length
        if (existemErros) {
            return new Promise((resolve, reject) => reject(erros));
        } else {
            const atendimentoDatado = { ...atendimento, dataCriacao, data }
            return repositorio.adiciona(atendimentoDatado)
                .then((resultados) => {
                    const id = resultados.insertId
                    return ({ ...atendimento, id })
                });
        }
    }

    lista() {
        return repositorio.lista();
    }

    buscaPorId(id, res) {
        const sql = `SELECT * FROM atendimentos where id = ${id}`;
        conexao.query(sql, async (erro, resultados) => {
            const atendimento = resultados[0];
            const cpf = atendimento.cliente;

            if (erro) {
                res.status(400).json(erro);
            } else {
                const { data } = await axios.get(`http://localhost:8082/${cpf}`)
                atendimento.cliente = data;
                res.status(200).json(atendimento);
            }
        })
    }

    altera(id, valores, res) {
        const sql = `UPDATE atendimentos SET ? WHERE id=?`;
        if (valores.data) {
            valores.data = moment(valores.data, 'DD/MM/YYYY').format('YYYY-MM-DD HH:mm:ss')
        }
        conexao.query(sql, [valores, id], (erro, resultados) => {
            if (erro) {
                res.status(400).json(erro);
            } else {
                res.status(200).json({ ...valores, id });
            }

        })
    }

    deleta(id, res) {
        const sql = `DELETE from atendimentos where id=?`;
        conexao.query(sql, id, (erro, resultado) => {
            if (erro) {
                res.status(400).json(erro);
            } else {
                res.status(200).json({ id });
            }
        })
    }
}

module.exports = new Atendimento