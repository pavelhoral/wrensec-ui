/**
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal/CDDLv1.0.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal/CDDLv1.0.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2015-2016 ForgeRock AS.
 * Portions Copyright 2026 Wren Security.
 */

define([
], function() {
    var obj = {
        "examplesPage" : {
            view: "org/forgerock/mock/ui/examples/ExamplesView",
            role: "ui-user",
            url: "examples/"
        },
        "componentsPage" : {
            view: "org/forgerock/mock/ui/components/ComponentsView",
            role: "ui-user",
            url: "components/"
        },
        "reactExample" : {
            view: "org/forgerock/mock/ui/react/ReactExampleView",
            role: "ui-user",
            url: /^react\/?([^/]+)?$/,
            pattern: "react/?",
            defaults: ["World"]
        }
    };

    return obj;
});
