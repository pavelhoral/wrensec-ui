/*
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal/CDDLv1.1.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal/CDDLv1.1.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2026 Wren Security.
 */

import React from "react";
import withRouter from "org/forgerock/commons/ui/common/components/hoc/withRouter";

const h = React.createElement;

/**
 * Example of a React view rendered by ViewManager (through ReactAdapterView) with router parameters
 * provided by withRouter.
 */
const ReactExample = ({ router }) => {
    const [name] = router.params;
    const [count, setCount] = React.useState(0);

    return h("div", { className: "container" },
        h("div", { className: "page-header" },
            h("h1", null, "React Example")
        ),
        h("div", { className: "card" },
            h("div", { className: "card-body" },
                h("p", null,
                    "This view is a React ", h("code", null, React.version),
                    " function component rendered by ", h("code", null, "ReactAdapterView"), "."
                ),
                h("p", null,
                    "Hello, ", h("strong", { id: "reactExampleParam" }, name), "! ",
                    "The route parameter is provided by ", h("code", null, "withRouter"), ". Try ",
                    h("a", { href: "#react/Wren" }, "#react/Wren"), " or ",
                    h("a", { href: "#react/Security" }, "#react/Security"), "."
                ),
                h("button", {
                    type: "button",
                    className: "btn btn-outline-primary",
                    id: "reactExampleCounter",
                    onClick: () => setCount(count + 1)
                }, `Clicked ${count} times`)
            )
        )
    );
};

export default withRouter(ReactExample);
