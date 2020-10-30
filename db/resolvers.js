const Usuario = require('../models/Usuario');
const Proyecto = require('../models/Proyecto');
const Tarea = require('../models/Tarea');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: 'variables.env'});

//Crea y firma un JWT
const crearToken = (usuario, secreta, expiresIn) =>{
   // console.log(usuario);
    const { id, email, nombre} = usuario;

    return jwt.sign({id, email, nombre}, secreta, {expiresIn})
}

const resolvers = {
    Query: {
        obtenerProyectos: async (_, {}, ctx) => {
            const proyectos = await Proyecto.find({creador: ctx.usuario.id});

            return proyectos;
        },
        obtenerTareas: async (_, {input}, ctx) => {
            const tareas = await Tarea.find({ creador: ctx.usuario.id}).where('proyecto').equals(input.proyecto);
            return tareas;
        }

    },
    Mutation: {
        crearUsuario: async (_,{input}) => {
            
            const {email, password} = input;

            const existeUsuario = await Usuario.findOne({ email });

            //Si el usuario existe
            if(existeUsuario){
                throw new Error('El usuario ya esta registrado');
            }

            try {
                //Hashear passowrd
                const salt = await bcryptjs.genSalt(10);
                input.password = await bcryptjs.hash(password, salt);

                console.log(input);
                //Registrar nuevo usuario
                const nuevoUsuario = new Usuario(input);
                console.log(nuevoUsuario);

                nuevoUsuario.save();
                return "Usuario creado con exito";
            } catch (error) {
                console.log(error);
            }
        },
        autenticarUsuario: async (_, {input}) => {
            const {email, password} = input;

            //Si el usuario existe
            const existeUsuario = await Usuario.findOne({ email });

            if(!existeUsuario){
                throw new Error('El usuario no esta registrado');
            }
            //Si el password es correcto
            const passwordCorrecto = await bcryptjs.compare(password, existeUsuario.password);

            if(!passwordCorrecto){
                throw new Error('Password Incorrecto');
            }
            //Dar acceso a la app
            return {
                token: crearToken(existeUsuario, process.env.SECRETA, '4hr')
            }
        },
        nuevoProyecto: async (_, {input}, ctx) => {

            try {
                const proyecto = new Proyecto(input);

                //Asociar el creador
                proyecto.creador = ctx.usuario.id;

                //Almacenar en la DB
                const resultado = await proyecto.save();

                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarProyecto: async (_, {id, input}, ctx) => {
            //Revisar que el proyecto exista
            let proyecto = await Proyecto.findById(id);

            if(!proyecto){
                throw new Error("Proyecto no encontrado");
            }
            //Revisar que si la persona que trata d editarlo es el creador
            if(proyecto.creador.toString() !== ctx.usuario.id){
                throw new Error("No tienes permiso para editar este proyecto");
            }
            //guardar Proyecto
            proyecto = await Proyecto.findOneAndUpdate({_id: id}, input, {new: true});

            return proyecto;
        },
        eliminarProyecto: async (_, {id}, ctx) => {
            //Revisar que el proyecto exista
            let proyecto = await Proyecto.findById(id);

            if(!proyecto){
                throw new Error("Proyecto no encontrado");
            }
            //Revisar que si la persona que trata d editarlo es el creador
            if(proyecto.creador.toString() !== ctx.usuario.id){
                throw new Error("No tienes permiso para editar este proyecto");
            }

            //Eliminar 
            await Proyecto.findOneAndDelete({_id : id });

            return "Proyecto Eliminado";
        },
        nuevaTarea: async (_, {input}, ctx) => {
            try {
                const tarea = new Tarea(input);
                tarea.creador = ctx.usuario.id;
                const resultado = await tarea.save();
                return resultado;
            } catch (error) {
                console.log(error);
            }
        },
        actualizarTarea: async (_, {id, input, estado}, ctx) => {
            //Si la tarea existe o no
            let tarea = await Tarea.findById(id);

            if(!tarea){
                throw new Error('Tarea no encontrada');
            }
            //Si la persona es el dueño
            if(tarea.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes permiso para editar');
            }

            //Asignar estado
            input.estado = estado;

            //Guardar y retornar la tarea
            tarea = await Tarea.findOneAndUpdate({_id : id}, input, {new: true});

            return tarea;
        },
        eliminarTarea: async (_, {id}, ctx) => {
            //Si la tarea existe o no
            let tarea = await Tarea.findById(id);

            if(!tarea){
                throw new Error('Tarea no encontrada');
            }
            //Si la persona es el dueño
            if(tarea.creador.toString() !== ctx.usuario.id){
                throw new Error('No tienes permiso para editar');
            }
            
            //Eliminar Tarea
            await Tarea.findOneAndDelete({_id: id});

            return "Tarea Eliminada";
        }
    }
}

module.exports = resolvers;