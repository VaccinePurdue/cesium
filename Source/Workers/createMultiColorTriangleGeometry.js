/*global define*/
define([
        '../Core/Ellipsoid',
        '../Core/MultiColorTriangleGeometry'
    ], function(
            Ellipsoid,
            MultiColorTriangleGeometry) {
    "use strict";

    function createMultiColorTriangleGeometry(multiColorTriangleGeometry, offset) {
        multiColorTriangleGeometry._ellipsoid = Ellipsoid.clone(multiColorTriangleGeometry._ellipsoid);
        return MultiColorTriangleGeometry.createGeometry(multiColorTriangleGeometry);
    }

    return createMultiColorTriangleGeometry;
});