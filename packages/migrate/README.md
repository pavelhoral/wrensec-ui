# Wren Security UI - Migrate

Command line tool that migrates applications and customer template overrides to commons 24.0: it converts Less
styles to SCSS modules and Bootstrap 3 markup to Bootstrap 5, and reports what it can't convert.

The tool is run once per application, without adding a dependency. Get the package from the `migrate` assembly
of the commons release (or build this repository and use `packages/migrate/dist`):

```sh
mvn dependency:unpack -Dartifact=org.wrensecurity.commons:wrensec-ui-commons:24.0.0:zip:migrate \
    -DoutputDirectory=target/ui-migrate
alias wrensec-ui-migrate="npx --yes --package=$PWD/target/ui-migrate/wrensecurity-commons-ui-migrate-0.0.0.tgz \
    wrensec-ui-migrate"
```

Run the commands in this order, on the application sources (directories or files):

```sh
wrensec-ui-migrate scss src/main/resources/css          # Less → SCSS (dry run)
wrensec-ui-migrate scss --write src/main/resources/css
wrensec-ui-migrate bootstrap5 src/main/resources src/main/js
wrensec-ui-migrate bootstrap5 --write src/main/resources src/main/js
```

Without `--write`, a command prints unified diffs of the changes (a dry run). With `--write`, it writes them (review
them with `git diff`). Both commands end with a report of what has to be fixed by hand, with the file, line and the
replacement (`--json` prints the changes and the report as JSON). `node_modules`, `target`, `libs`, `build` and
`dist` directories and minified files are skipped.

## scss

Converts `*.less` files to `*.scss` files following `UPGRADE.md`:

* variables (`@name` → `$name`), commons variables (`@base-theme-color` → `var(--wrensec-base-theme-color)`,
  `darken(@base-theme-color, 5%)` → `var(--wrensec-base-theme-color-dark)`) and Less color functions
  (`lighten(@color, 10%)` → `color.adjust($color, $lightness: 10%)`, with commons Sass variables as arguments),
* imports: commons entry points (`common/structure.less` → `@use "common/structure"`), application files
  (`@use "partials/card"`, an alias when the namespace is taken), CSS files (plain `@import "x.css"` after the `@use`
  rules), nested imports (`@include meta.load-css("x")`) and removed libraries (titatoggle, bootstrap-dialog, Font
  Awesome 4),
* variables declared in another application file (`@use "partials/variables" as *`),
* commons mixins (`.fa-icon();`, `.icon-circle(28px);`, `.ellipsis;`, `.transition(…);`), breakpoints
  (`@media (min-width: @screen-sm)` → `@include mixins.media-up(md)`), `~"…"` escapes, `@{name}` interpolation and
  `&:extend(.x)`.

Reported: application mixin definitions and calls, guards, Bootstrap 3 and Font Awesome 4 Less variables, other
breakpoint expressions and the gulpfile (`useLessStyles` → `useScssStyles`).

## bootstrap5

Renames Bootstrap 3 classes and data attributes in templates (`*.html`, `*.hbs`), scripts (`*.js`, `*.mjs`, `*.jsm`,
`*.jsx`) and styles (`*.scss`, `*.less`, `*.css`):

* templates: class attributes (including classes inside Handlebars blocks) and data attributes of start tags,
* scripts: class lists of `addClass` / `removeClass` / `toggleClass` / `hasClass`, `className` and `cssClass`
  properties, selectors of `$()`, `find()`, `closest()`, `on()`, … and Backbone `events`, HTML fragments (also
  concatenated with expressions), `className` of JSX elements and `whiteList` options,
* styles: class and attribute selectors and `@extend`.

All renames of a class list are made in one pass (`col-sm-6` becomes `col-md-6`, not `col-lg-6`). Renames that
depend on context use the element (`form-control` on `<select>` → `form-select`), the other classes of the list
(`in` with `fade` → `show`) or the file (`control-label` → `col-form-label` only when the file contains
`form-horizontal`). The grid is not tier-shifted in a file that contains Bootstrap 5 classes, so a second run changes
nothing.

Reported: structural markup (checkboxes, switches, input group buttons, navs, navbars, media objects, removed
components, …), classes built by concatenation, classes of components (react-bootstrap), Bootstrap 3 plugin APIs,
jQuery 4 removed APIs and removed RequireJS modules.

## Development

`npm test` runs the fixture tests (`test/fixtures`: `*.input.*` migrated to `*.output.*` with the expected
`*.reports.txt`; Less inputs converted to the `expected` SCSS files). A fixture of a wrong change is the way to fix
it.
