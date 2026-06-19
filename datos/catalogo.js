// =============================================================================
// CATALOGO DE MAQUINAS
// =============================================================================
//
// Aqui se definen todas las marcas, modelos y puntos de revision.
// Para anadir una marca nueva: copia el bloque { id, nombre, modelos: [...] }
// Para anadir un modelo nuevo dentro de una marca:
//   1. Copia la imagen en la carpeta imagenes/
//   2. Copia el bloque de modelo de ejemplo de abajo y rellena los campos
//
// Campos de cada modelo:
//   id      -> identificador interno unico, sin espacios (ej: 'bp600ar')
//   nombre  -> nombre que aparece en la lista (ej: 'BP600AR 150P')
//   imagen  -> ruta a la foto (ej: 'imagenes/mifoto.jpg'), o null si no hay foto
//   puntos  -> lista de puntos de revision (puede estar vacia si imagen es null)
//
// Campos de cada punto (cuando hay imagen):
//   id      -> identificador unico dentro del modelo (ej: 'p1')
//   nombre  -> nombre visible del punto (ej: 'Filtro de aire')
//   x, y    -> posicion en % sobre la imagen (0-100 en cada eje)
//              Para calcular estas coordenadas sobre una imagen nueva,
//              puedes usar el script de utilidad incluido en la carpeta /herramientas
//
// Ejemplo de modelo SIN imagen (usa lista de puntos simple):
//   { id: 'mi_modelo', nombre: 'Mi Modelo', imagen: null, puntos: [
//       { id: 'p1', nombre: 'Punto de revision 1', x: null, y: null },
//       { id: 'p2', nombre: 'Punto de revision 2', x: null, y: null },
//   ]}
//
// =============================================================================

const CATALOGO = [
  {
    id: 'smipack',
    nombre: 'SmiPack',
    modelos: [
      {
        id: 'bp600ar',
        nombre: 'BP600AR 150P',
        imagen: 'imagenes/BP600AR_150P.png',
        // Coordenadas calculadas automaticamente detectando los circulos
        // verdes que ya vienen pintados en la imagen original
        puntos: [
          { id: 'p1', nombre: 'Punto 1', x: 95.02, y: 26.32 },
          { id: 'p2', nombre: 'Punto 2', x: 48.58, y: 27.76 },
          { id: 'p3', nombre: 'Punto 3', x: 39.30, y: 39.29 },
          { id: 'p4', nombre: 'Punto 4', x: 69.92, y: 41.77 },
          { id: 'p5', nombre: 'Punto 5', x: 30.91, y: 60.28 },
          { id: 'p6', nombre: 'Punto 6', x: 23.97, y: 64.12 },
          { id: 'p7', nombre: 'Punto 7', x: 40.31, y: 67.06 },
          { id: 'p8', nombre: 'Punto 8', x: 71.57, y: 68.05 },
          { id: 'p9', nombre: 'Punto 9', x: 77.01, y: 76.81 },
          { id: 'p10', nombre: 'Punto 10', x: 59.76, y: 81.21 },
        ]
      },
      {
        id: 'otro_smi',
        nombre: 'Otro modelo',
        imagen: null,
        puntos: []
      }
    ]
  },
  {
    id: 'robotech',
    nombre: 'Robotech',
    modelos: [
      {
        id: 'robotech_3000pgs',
        nombre: '3000 PGS',
        imagen: 'imagenes/robotech-3000pgs.jpg',
        // Pendiente de colocar los puntos sobre la foto.
        // Mientras tanto funciona en modo lista.
        puntos: [
          { id: 'p1', nombre: 'Punto 1', x: null, y: null },
        ]
      },
      {
        id: 'robotech_m2',
        nombre: 'Modelo 2',
        imagen: null,
        puntos: []
      }
    ]
  }
];