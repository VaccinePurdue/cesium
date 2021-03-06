/*global define*/
define([
        './BoundingRectangle',
        './BoundingSphere',
        './Cartesian2',
        './Cartesian3',
        './Color',
        './ComponentDatatype',
        './defaultValue',
        './defined',
        './DeveloperError',
        './Ellipsoid',
        './EllipsoidTangentPlane',
        './Geometry',
        './GeometryAttribute',
        './GeometryAttributes',
        './GeometryInstance',
        './GeometryPipeline',
        './IndexDatatype',
        './Math',
        './Matrix3',
        './PolygonGeometryLibrary',
        './PolygonPipeline',
        './PrimitiveType',
        './Quaternion',
        './VertexFormat',
        './Vertex',
        './WindingOrder',
        './Triangle'
    ], function(
        BoundingRectangle,
        BoundingSphere,
        Cartesian2,
        Cartesian3,
        Color,
        ComponentDatatype,
        defaultValue,
        defined,
        DeveloperError,
        Ellipsoid,
        EllipsoidTangentPlane,
        Geometry,
        GeometryAttribute,
        GeometryAttributes,
        GeometryInstance,
        GeometryPipeline,
        IndexDatatype,
        CesiumMath,
        Matrix3,
        PolygonGeometryLibrary,
        PolygonPipeline,
        PrimitiveType,
        Quaternion,
        VertexFormat,
        Vertex,
        WindingOrder,
        Triangle) {
    "use strict";

    var createGeometryFromPositionsPositions = [];

    function createGeometryFromPositions(ellipsoid, positions, colors) {
        var tangentPlane = EllipsoidTangentPlane.fromPoints(positions, ellipsoid);
        var positions2D = tangentPlane.projectPointsOntoPlane(positions, createGeometryFromPositionsPositions);

        var originalWindingOrder = PolygonPipeline.computeWindingOrder2D(positions2D);
        if (originalWindingOrder === WindingOrder.CLOCKWISE) {
            positions2D.reverse();
            positions.reverse();
            colors.reverse();
        }

        var boundingSphere = BoundingSphere.fromVertices(positions);
        var indices = PolygonPipeline.triangulate(positions2D);
        /* If polygon is completely unrenderable, just use the first three vertices */
        if (indices.length < 3) {
            indices = [0, 1, 2];
        }

        var geo;

        var length = positions.length;
        var flattenedPositions = new Array(length * 3);
        var flattenedColors = new Uint8Array(length * 4);
        var index = 0;
        var colorIndex = 0;
        for ( var i = 0; i < length; i++) {
            var p = positions[i];
            var c = colors[i];

            flattenedPositions[index++] = p.x;
            flattenedPositions[index++] = p.y;
            flattenedPositions[index++] = p.z;

            flattenedColors[colorIndex++] = Color.floatToByte(c.red);
            flattenedColors[colorIndex++] = Color.floatToByte(c.green);
            flattenedColors[colorIndex++] = Color.floatToByte(c.blue);
            flattenedColors[colorIndex++] = Color.floatToByte(c.alpha);
        }

        geo = new Geometry({
            attributes : {
                position : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.DOUBLE,
                    componentsPerAttribute : 3,
                    values : flattenedPositions
                }),
                color : new GeometryAttribute({
                    componentDatatype : ComponentDatatype.UNSIGNED_BYTE,
                    componentsPerAttribute : 4,
                    values : flattenedColors,
                    normalize : true
                })
            },
            indices : indices,
            primitiveType : PrimitiveType.TRIANGLES
        });


        return new GeometryInstance({
            geometry : geo
        });
    }

    /**
     * A multicolor triangle geometry takes multiple triangles with each vertex having a different color This is set up
     * to allow developers to utilize the power of webGL on top of cesium by drawing triangles that can make up polygons.
     * Either a list of triangles can be used to specify the triangles used or the positions and colors can be set
     * serieally in positions and colors.
     *
     * @alias MultiColorTriangleGeometry
     * @constructor
     *
     * @param {Object} options Object with the following properties:
     * @param {Triangle[]} [options.triangles] A list of triangles that encapsulates the color and position.
     * @param {Cartesian3[]} [options.positions] A list of positions where every three positions are the corner point of a triangle.
     * @param {Color[]} [options.colors] An Array of {@link Color} defining the per vertex or per segment colors.
     * @param {Ellipsoid} [options.ellipsoid=Ellipsoid.WGS84] The ellipsoid to be used as a reference.
     * @param {Boolean} [options.connectVertices] Optional parameter that attempts to link.
     * @param {VertexFormat} [options.vertexFormat=VertexFormat.POSITION_AND_COLOR] The vertex attributes to be computed.
     *
     * @exception {DeveloperError} Either triangles or (positions and colors) must be defined.
     * @exception {DeveloperError} At least 3 positions are required and must be a multiple of 3.
     * @exception {DeveloperError} colors is required to be the same size as positions(color per vertex).
     *
     * @see MultiColorTriangleGeometry#createGeometry
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=development/MultiColorTriangles.html|Cesium Sandcastle MultiColorTriangle Demo}
     *
     * @example
     *var vertices = [
     *       new Cesium.Vertex({
     *           vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
     *           position: Cesium.Cartesian3.fromDegrees(-115.0, 37.0),
     *           color: Cesium.Color.RED.withAlpha(180/255)
     *       }),
     *       new Cesium.Vertex({
     *           vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
     *           position: Cesium.Cartesian3.fromDegrees(-115.0, 32.0),
     *           color: Cesium.Color.BLUE.withAlpha(180/255)
     *       }),
     *       new Cesium.Vertex({
     *           vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
     *           position: Cesium.Cartesian3.fromDegrees(-107.0, 33.0),
     *           color: Cesium.Color.GREEN.withAlpha(180/255)
     *       }),
     *       new Cesium.Vertex({
     *           vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
     *           position: Cesium.Cartesian3.fromDegrees(-102.0, 31.0),
     *           color: Cesium.Color.ORANGE.withAlpha(180/255)
     *       }),
     *       new Cesium.Vertex({
     *           vertexFormat: Cesium.VertexFormat.POSITION_AND_COLOR,
     *           position: Cesium.Cartesian3.fromDegrees(-102.0, 35.0),
     *           color: Cesium.Color.AQUA.withAlpha(180/255)
     *       })
     *   ];
     *
     *   var polygonVertices = [[0,1,2], [0,2,4], [3,2,4], [1,2,3]];
     *
     *   var triangles = [];
     *
     *   for(var i=0;i<polygonVertices.length;i++){
     *       var verts = [];
     *       for(var j=0;j<polygonVertices[i].length;j++){
     *           var index=polygonVertices[i][j];
     *           verts.push(vertices[index]);
     *       }
     *       triangles.push(new Cesium.Triangle({
     *           vertices : verts
     *       }));
     *   }
     *
     *   scene.primitives.add(
     *       new Cesium.Primitive({
     *           geometryInstances : new Cesium.GeometryInstance({
     *               geometry : new Cesium.MultiColorTriangleGeometry({
     *                   triangles : triangles
     *               })
     *           }),
     *           appearance : new Cesium.MultiColorTriangleAppearance()
     *       })
     *
     *   );
     */
    var MultiColorTriangleGeometry = function(options) {
        //options = defaultValue(options, defaultValue.EMPTY_OBJECT);
        //>>includeStart('debug', pragmas.debug);

        if (!defined(options)) {
            throw new DeveloperError('options is required.');
        }

        if (!defined(options.positions) && !defined(options.triangles)) {
            throw new DeveloperError('Either positions or triangles must be defined.');
        }

        if (defined(options.positions) &&
                ((options.positions.length <= 3) || options.positions.length % 3 ===0)) {
            throw new DeveloperError('positions must be defined and have at least a length of 3 and the length must be a multiple of 3.');
        }
        if (defined(options.colors) && (options.colors.length === options.positions.length)) {
            throw new DeveloperError('colors must have the same length as positions.');
        }


        //>>includeEnd('debug');
        var ellipsoid = defaultValue(options.ellipsoid, Ellipsoid.WGS84);
        var vertexFormat = VertexFormat.clone(defaultValue(options.vertexFormat, VertexFormat.POSITION_AND_COLOR));
        var positions = defined(options.positions) ? options.positions : [];
        var colors = defined(options.colors) ? options.colors : [];
        var triangles = defined(options.triangles) ? options.triangles : [];
        var i;

        var tris = [];

        //take every three positions and add it to list of triangles
        for(i=0;i<positions.length;i+=3){
            tris.push({
                positions : [positions[i],
                             positions[i + 1],
                             positions[i + 2]],
                colors: [colors[i],
                         colors[i + 1],
                         colors[i + 2]]
            });
        }

        for(i=0; i < triangles.length; i++){
            positions = [];
            colors = [];
            for(var j=0; j<3; j++){
                positions.push(triangles[i].vertices[j].position);
                colors.push(triangles[i].vertices[j].color);
            }

            tris.push({
                positions : positions,
                colors: colors
            });

        }

        this._positions = positions;
        this._colors = colors;
        this._ellipsoid = ellipsoid;
        this._vertexFormat = vertexFormat;
        this._triangles = tris;
        this._granularity = defaultValue(options.granularity, CesiumMath.RADIANS_PER_DEGREE);

        this._workerName = 'createMultiColorTriangleGeometry';
    };


    MultiColorTriangleGeometry.createGeometry = function(MultiColorTriangleGeometry) {
        var vertexFormat = MultiColorTriangleGeometry._vertexFormat;
        var ellipsoid = MultiColorTriangleGeometry._ellipsoid;
        var polygons = MultiColorTriangleGeometry._triangles;
        var granularity = MultiColorTriangleGeometry._granularity;
        var geometries = [];
        var perPositionHeight = false;
        var outerPositions = polygons[0];

        var geometry;
        var i;

        for (i = 0; i < polygons.length; i++) {
            geometry = createGeometryFromPositions(ellipsoid, polygons[i].positions, polygons[i].colors);
            geometry.geometry = PolygonPipeline.scaleToGeodeticHeight(geometry.geometry, 0, ellipsoid, !perPositionHeight);
            geometries.push(geometry);
        }

        geometry = GeometryPipeline.combineInstances(geometries)[0];
        geometry.attributes.position.values = new Float64Array(geometry.attributes.position.values);
        geometry.indices = IndexDatatype.createTypedArray(geometry.attributes.position.values.length / 3, geometry.indices);

        var attributes = geometry.attributes;
        var boundingSphere = BoundingSphere.fromVertices(attributes.position.values);

        if (!vertexFormat.position) {
            delete attributes.position;
        }

        return new Geometry({
            attributes : attributes,
            indices : geometry.indices,
            primitiveType : geometry.primitiveType,
            boundingSphere : boundingSphere
        });

    };

    return MultiColorTriangleGeometry;
});