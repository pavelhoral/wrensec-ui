# Upgrade Guide

## 23.x -> 24.0

* Commons styles are SCSS instead of Less (`css/common/**/*.scss`, the `*.less` files have been removed). They are
  Sass modules to be built by applications (Less stylesheets can no longer import them):
  * `@use "common/common";` is a single entry point for the structure and the theme (replaces
    `common/structure.less` and `common/theme.less` imported together),
  * `@use "common/structure";` and `@use "common/theme";` are entry points for applications that build the
    structure and the theme as separate stylesheets,
  * `common/list`, `common/structure/backgrid` and `common/structure/notification` are optional partials not
    included in the structure (replace `@import "common/list.less";` with `@use "common/list";`, …).
* Build styles with `useScssStyles` of `@wrensecurity/commons-ui-build` (Sass with modules resolved from the base
  path and `pkg:` URLs from Node packages). Library CSS can be imported with plain CSS imports after the `@use`
  rules (`@import "selectize.css";`), which are inlined with relative URLs rebased. Other relative URLs are relative
  to the built stylesheet. `useLessStyles` is deprecated and will be removed in 25.0.
* Less variables of the former `common/forgerock-variables.less` (remove its import) are CSS custom properties, so
  themes can change them at runtime: `@base-theme-color` → `var(--wrensec-base-theme-color)`, … Their defaults are
  Sass variables of the `common/variables` module, which can be configured when the module is loaded for the first
  time: `@use "common/variables" with ($base-theme-color: #123456);`. `darken(@base-theme-color, 5%)` →
  `var(--wrensec-base-theme-color-dark)` (new property derived from the accent color). Other color functions need
  the Sass variables (`variables.$base-theme-color`, resolved at build time) or CSS `color-mix()`.
* Media query breakpoints are mixins of the `common/mixins` module (`@use "common/mixins";`), named by Bootstrap 5
  grid tiers: `@media (min-width: @screen-sm)` → `@include mixins.media-up(md)` (768px), `@screen-md` →
  `media-up(lg)` (992px), `@screen-lg` → `media-up(xl)` (1200px), `@screen-xs` → `media-up(xs)` (480px) and
  `@media (max-width: @screen-sm)` → `@include mixins.media-max(md)`. `media-down(md)` matches Bootstrap 5
  `media-breakpoint-down(md)` (narrower than 768px, e.g. where a navigation bar expanded from `md` is collapsed).
* Mixins of the former `common/helpers.less`: `.fa-icon();` → `@include mixins.fa-icon;`, `.icon-circle(20px);` →
  `@include mixins.icon-circle(20px);`, `.ellipsis;` → `@extend .ellipsis;` and `.transition(color, .1s, linear);`
  → `transition: color .1s linear;` (vendor prefixes are not needed). `.arrow-*()`, `.multi-column-layout()` and
  `.nocache-background-image()` have been removed.
* Bootstrap has been upgraded from 3.4.1 to 5.3 (see https://getbootstrap.com/docs/5.3/migration/):
  * commons no longer ships a built `css/bootstrap.css`; applications build Bootstrap with the Wren Security theme from
    `@use "common/bootstrap";` (by `useScssStyles`), which can override any Bootstrap variable including the Wren
    defaults (`@use "common/bootstrap" with ($primary: #123456);`), and runtime themes can change the `--bs-*` CSS
    custom properties (e.g. Wren:IDM themes in `ui-themeconfig.json` refer to the application's built stylesheet);
    the Bootstrap sources are a dependency of `@wrensecurity/commons-ui-build`, applications do not install them,
  * `libs/bootstrap.js` is Bootstrap 5 with Popper as an AMD module (`bootstrap`, depending on `jquery`), remove
    the `bootstrap` RequireJS shim; the jQuery plugin interface (`$(element).modal(…)`, `tooltip`, `popover`, …)
    remains available, but options, events and `data-bs-*` attributes follow Bootstrap 5.
* Commons templates use Bootstrap 5 markup; applications that override them have to migrate their copies:
  * the navigation (`#mainNavHolder`) is a `navbar navbar-expand-md` with `data-bs-theme="dark"`, its items are
    `nav-item` / `nav-link` and `dropdown-item`, and the `navigation/_NavigationLink` partial takes the link class
    as the `linkClass` parameter,
  * panels are cards, profile tabs are `nav-item` / `nav-link` elements, horizontal form groups are rows with
    `col-form-label` labels and selects are `form-select`,
  * the default button class (including `ModalDialog` buttons) is `btn-outline-primary` instead of `btn-default`.
* Commons styles keep providing classes that Bootstrap 5 removed and that commons validation and templates rely on:
  `form-group` (with validation states `has-feedback`, `has-error`, `has-warning`, `has-success` and
  `form-control-feedback` icons), `page-header` and `caret`. Labels are bold (except `form-check-label`).
* The page background is `--wrensec-background-color`; Bootstrap components (cards, dialogs, inputs, …) are white.
* Bootstrap 3 markup in application templates has to be migrated (see the Bootstrap migration guide), e.g.:
  grid tiers shift by one (`col-xs-*` → `col-*`, `col-sm-*` → `col-md-*`, `col-md-*` → `col-lg-*`,
  `col-lg-*` → `col-xl-*`, `col-sm-offset-*` → `offset-md-*`, …), `panel*` → `card*`, `pull-left` / `pull-right` →
  `float-start` / `float-end`, `text-left` / `text-right` → `text-start` / `text-end`, `sr-only` →
  `visually-hidden`, `help-block` → `form-text`, `control-label` → `col-form-label`, `input-lg` →
  `form-control-lg`, `btn-block` → `w-100`, `btn-default` → `btn-outline-primary`, `hidden` → `d-none`,
  `checkbox` → `form-check`, `data-toggle` / `data-target` / `data-dismiss` → `data-bs-*` and dropdown carets
  are added by Bootstrap (remove `<span class="caret"></span>` from dropdown toggles, and the `dropdown-toggle` class
  from icon only toggles that should have no caret).
* `css/selectize.css` is the Selectize Bootstrap 5 theme (commons structure adapts it to the Bootstrap theme colors)
  and the backgrid paginator (`ThemeablePaginator`) renders Bootstrap 5 pagination (`page-item` / `page-link`).
* titatoggle has been removed (remove `@import "titatoggle.css";`), use Bootstrap 5 switches instead:
  `<div class="checkbox checkbox-slider-primary checkbox-slider checkbox-slider--b"><label><input type="checkbox">
  <span>Label</span></label></div>` → `<div class="form-check form-switch"><input class="form-check-input"
  type="checkbox" role="switch" id="active"><label class="form-check-label" for="active">Label</label></div>`.
* Font Awesome has been upgraded from 4.7 to 7 Free (see https://docs.fontawesome.com/web/setup/upgrade/):
  * commons structure includes Font Awesome (module `common/fontawesome`), remove imports of
    `fontawesome/css/font-awesome.css` and `fontawesome/less/variables.less`; the fonts are provided in
    `css/fontawesome/webfonts` and loaded relative to the built stylesheet, which can be configured with
    `@use "common/fontawesome" with ($font-path: "…");` (the Font Awesome sources are a dependency of
    `@wrensecurity/commons-ui-build`, applications do not install them),
  * Font Awesome 4 class names (`fa fa-*`, including renamed icons) keep working through the Font Awesome v4 shims,
    and so does the `FontAwesome` font family with Font Awesome 4 code points,
  * styles can use `@include mixins.fa-icon(solid);` (or `regular`, `brands`) with named glyphs:
    `content: fontawesome.fa-content(fontawesome.$var-circle-check);` (`@use "common/fontawesome";`),
  * icons are fixed width by default (`fa-fw` is not needed any more, `fa-width-auto` restores the natural width).
* jQuery has been upgraded from 3 to 4 (see https://jquery.com/upgrade-guide/4.0/):
  * removed APIs have native replacements: `$.trim(s)` → `s.trim()`, `$.isArray(a)` → `Array.isArray(a)`,
    `$.parseJSON(s)` → `JSON.parse(s)`, `$.isFunction(f)` → `typeof f === "function"`, `$.now()` → `Date.now()`,
    `.size()` → `.length`, … (also `$.type`, `$.isNumeric`, `$.isWindow`, `$.camelCase`, `$.nodeName`,
    `$.unique` and `.toggleClass(boolean)` have been removed),
  * Selectize declares jQuery 3 as its peer dependency, so applications have to override the jQuery version in their
    `package.json` to install a single jQuery: `"overrides": { "jquery": "^4.1.0" }`.
* `bootstrap-dialog` library has been replaced by the commons module
  `org/forgerock/commons/ui/common/components/ModalDialog`, which renders the same markup (Bootstrap modal with
  `bootstrap-dialog*` CSS classes, the close button is Bootstrap 5 `.btn-close`) and supports the subset of bootstrap-dialog API used by Wren Security applications
  (`ModalDialog.show(options)`, `new ModalDialog(options).open()`, `close()`, `getButton(id)` with `enable()` /
  `disable()`, `getData()` / `setData()`, `getModal*()` accessors and `onshow` / `onshown` / `onhide` /
  `onhidden` callbacks):
  * remove `libs/bootstrap-dialog` from RequireJS paths and shims; code that requires `bootstrap-dialog` directly
    can keep working with a RequireJS map entry
    `map: { "*": { "bootstrap-dialog": "org/forgerock/commons/ui/common/components/ModalDialog" } }`,
  * remove `@import "bootstrap-dialog.css";` from application styles (the necessary styles are part of the commons
    structure),
  * not supported: `BootstrapDialog.alert()` / `confirm()` / `warning()` / `danger()` / `success()` /
    `closeAll()`, the `dialogs` registry, setters (`setTitle()`, `setMessage()`, …), `draggable`, `spinicon`,
    `btnsOrder`, `closeByBackdrop` / `closeByKeyboard` (use `closable`) and button `autospin`,
  * the commons wrapper `components/BootstrapDialog` keeps `show()` and `confirm()`, while `warning()`, `danger()`
    and `success()` have been removed.

## 23.4.x -> 23.5.x

* `@wrensecurity/commons-ui-build` (`useEslint`) uses ESLint 10, which supports only flat configuration
  (`eslint.config.*`). Upgrade `@wrensecurity/eslint-config` to 0.5.0 and `eslint` to 10 (Wren:IDM, Wren:IG).
  Projects still using `.eslintrc.*` have to migrate to flat configuration (Wren:AM, already required since the
  ESLint 9 upgrade). React rules (`@wrensecurity/eslint-config/react`) require `eslint-plugin-react`, which does
  not support ESLint 10 yet.
* Bundled libraries have been upgraded to their latest minor versions (e.g. jQuery 3.8, Backbone 1.6,
  Handlebars 4.7.10).
* React is no longer provided (`libs/react.js`, `libs/react-dom.js` and `libs/create-react-class.js` have been
  removed). Applications using the React related modules (`ReactAdapterView` via `ViewManager`, `reactify`,
  `withRouter`) have to provide `react` and `react-dom` modules themselves (Wren:AM already does).
  * `withRouter` is now a function component and no longer needs `create-react-class` (remove it from
    RequireJS configuration, e.g. Wren:AM `main.js`).
  * `ReactAdapterView` and `reactify` use the root API (`createRoot`) with React 18 and legacy
    `ReactDOM.render()` with older versions (React 16–18 UMD builds work as they are). With the root API
    rendering is asynchronous and `reactify` does not return the rendered component. `ReactDOM.unmountComponentAtNode()`
    does not unmount root API components, use `reactify.unmount(el)` instead (e.g. in a Backbone view `remove()`).
  * React 19 has no UMD builds and its `react-dom` module provides neither `createRoot` nor `render`. Applications
    using React 19 have to build their own AMD `react-dom` module that also exports `createRoot` from
    `react-dom/client` (e.g. using `useBuildModule`).
* i18next has been upgraded to 27 (with i18next-browser-languagedetector 8), see the migration guide
  https://www.i18next.com/misc/migration-guide. `i18nManager` keeps empty translations rendering as empty
  strings (`returnEmptyString: true`). Notable behavior changes:
  * Translating a key that contains an object (without `returnObjects`) returns the key instead of the
    "returned an object instead of string" sentence.
  * `/` is no longer escaped in interpolated values (`&`, `<`, `>`, `"` and `'` still are).
  * Language codes from the `locale` query parameter or the `i18next` cookie that do not look like language
    codes are ignored.
  * Translation files have to use the i18next v4 JSON format. Keys with the v3 `_plural` suffix have not been
    used since i18next 21 (use `_one` / `_other`), e.g. `*_plural` keys in Wren:AM and Wren:IDM translations.
* Selectize has been upgraded to 0.15 (see https://github.com/selectize/selectize.js/releases/tag/v0.15.0).
  Notable behavior changes:
  * Search matches only at word boundaries by default (e.g. `Name` no longer matches `givenName`). To keep
    the previous substring matching, set `$.fn.selectize.defaults.respect_word_boundaries = false` after loading
    the library (or pass `respect_word_boundaries: false` to individual instances).
  * `change` event is no longer triggered when the value has not changed (e.g. `setValue()` with the current
    value). Do not rely on it to run `change` handlers for the initial value.
  * Highlighted dropdown option in the Bootstrap 3 theme uses the primary (blue) color.
* Removed `delayedkeyup` jQuery special event from `UIUtils`. It has not been working since
  jQuery 1.9 (it relied on removed `$.event.handle`). Use `_.debounce` on a regular `keyup` handler instead.
* `LoginView` no longer applies the IE9 `placeholder` polyfill.
* Removed the following libraries. Any module that still depends on them (including startup module lists)
  fails to load, so replace their usages and remove them from RequireJS `paths` / `shim` configuration:
  * `libs/jquery.ba-dotimeout.js` (`doTimeout`) - replace `$.doTimeout(...)` with `setTimeout` /
    `_.debounce` (e.g. Wren:AM `CreatedResourcesView`, `StripedListEditingView`).
  * `libs/jquery.placeholder.js` (`placeholder`) - native `placeholder` attribute is supported by all
    current browsers (e.g. Wren:IDM admin `main.js` startup module list).
  * `libs/spin.js` (`spin`) - `SpinnerManager` now renders the loading spinner using CSS (`.spinner` in
    `common/structure.less`), its API is unchanged. Remove `spin` from RequireJS configuration and startup
    module lists (Wren:IDM admin and enduser, Wren:AM and Wren:IG `main.js`, Wren:IG test configuration).

## 23.1.x -> 23.2.x

* `react` and `react-dom` dependencies have been upgraded to version 16 (see https://legacy.reactjs.org/blog/2017/09/26/react-v16.0.html#breaking-changes).


## 23.0.x -> 23.1.x

* ProcessConfiguration allows defining synchronous event handler when there are no dependencies.
Downstream projects should prefer using synchronous event handlers as the legacy behavior might
be removed in later releases.


## 22.1.x -> 23.x

* Library files no longer contain version number in their name. Adding content hash or version
  suffix to prevent caching is responsibility of downstream projects.
* Library files are mostly non-minified so final optimization is responsibility of downstream
  projects.
* CodeMirror now requires custom ESM build step and styling is no longer being made through
  custom CSS (see example in the Mock module).
* Changed task runner from Grunt to Gulp and introduced new module `@wrensecurity/commons-ui-build`
  with shared Gulp task implementation. See individual gulpfiles for inspiration how to switch
  to Gulp in downstream projects.
* Project structure has been migrated from multimodule Maven to single Maven module with NPM
  workspaces. Maven artifact coordinates has to be migrated to the new artifact ID with separate
  workspace-specific classifier:
  * `forgerock-ui-commons:www:zip -> wrensec-ui-commons:base:zip`
  * `forgerock-ui-user:www:zip -> wrensec-ui-commons:user:zip`
* Upgraded lodash from 3.x to the newest 4.x version. See breaking changes described in 4.0.0
  release notes - https://github.com/lodash/lodash/wiki/Changelog#compatibility-warnings.
  Following regular expression searches can be performed to check for places that need attention:
  * removed methods -
    `\b(support|findWhere|where|pluck|first|indexBy|invoke|modArgs|padLeft|pairs|rest|restParam|sortByOrder|trimLeft|trimRight|trunc|sortByAll|isDeep)\(`
  * removed aliases -
    `\b(all|any|collect|compose|contains|detect|include|inject|methods|object|select|unique)\(`
  * split out methods -
    `\b(assign|assignIn|clone|cloneDeep|indexOf|lastIndexOf|invert|invertBy|isEqual|isEqualWith|isMatch|isMatchWith|max|min|merge|mergeWith|omit|pick|sample|sortedIndex|sortedLastIndex|sum|uniq|zipObject)\(`
  * dropped boolean options -
    `\b(debounce|mixin|throttle)\(`
  * `thisArg` removal (this one is the most tricky) -
    `(?<!\()\bthis\)`
* Introduced Underscore.js as its own dependency because Backbone is not compatible with lodash.
  All custom code should explicitly depend on `lodash` only. Hence replace `underscore` imports
  with `lodash` and remove module alias in RequireJS configuration (`underscore` and `lodash`
  are different dependenies from now on).
* Upgraded Backbone.js wich has few incompatibilities, mainly `View.delegate` property which
  is being used as alias to `delegateEvents`. This means that `delegate` MUST NOT be used
  as custom property (see changes in `org/forgerock/commons/ui/user/delegates/AnonymousProcessDelegate`).


## 21.x -> 22.1.x

* Build dependencies were upgraded (wrensec-parent, NodeJS, NPM, ...)


## 14.x -> 15.x

### React Support!

* ViewManager can now handle being passed either a Backbone or a React view.

* `react` and `react-dom` are bundled with commons, ensure you update your product license file(s). e.g. in OpenAM...
```
// openam-server-only/src/license/THIRD-PARTY.properties
org.forgerock.commons.ui.libs--react--15.2.1=BSD
org.forgerock.commons.ui.libs--react-dom--15.2.1=BSD
```

#### `withRouter`

* `org/forgerock/commons/ui/common/components/hoc/withRouter`

* React views are *not* passed parameters from the router as Backbone views are. This is intentional as not all view may need router parameters.

* `withRouter` is a HoC that you use access router parameters in your React component.
```javascript
import withRouter from "org/forgerock/commons/ui/common/components/hoc/withRouter"
class MyReactComponent extends Component { ... }
export default withRouter(MyReactComponent)
```


## 13.x -> 14.x

References to UserProfileView in projects which use forgerock-ui-user will need to be updated.
In 13.x, use of UserProfileView was determined via dependency injection in the requirejs map aliases, like so:

    require.config({ "map": { "*": {
        "UserProfileView" : (serverInfo.kbaEnabled === "true"
            ? "org/forgerock/commons/ui/user/profile/UserProfileKBAView"
            : "org/forgerock/commons/ui/user/profile/UserProfileView")
    } } });

This was based on the idea that you would swap out one whole view in favor of another, to be responsible
for rendering the user profile. Switching the view was used to decide whether or not to show the basic profile or the "KBA"-enhanced version.

In 14.x, the reference to the whole view no longer needs to be replaced. Instead, there is a single instance of the UserProfileView which simply needs to be told which child views are available for rendering additional tabs (such as the KBA tab). For example:

    if (serverInfo.kbaEnabled === "true") {
        require(["org/forgerock/commons/ui/user/profile/UserProfileKBATab"], (tab) => {
            UserProfileView.registerTab(tab);
        });
    }


## 12.x -> 13.x

The entries for form2js and js2form must be adjusted to match the new version. Previously it was listed like so:

    js2form: "libs/js2form-2.0",
    form2js: "libs/form2js-2.0",

Now they must be specified like so:

    js2form: "libs/js2form-2.0-769718a",
    form2js: "libs/form2js-2.0-769718a",


## 11.x -> 12.x

* There is a new parameter attached to the event for EVENT_SHOW_LOGIN_DIALOG : "authenticatedCallback". This is a function which is expected to be called when the inline login dialog has successfully re-authenticated the user. Since there is an expectation that the EVENT_SHOW_LOGIN_DIALOG could be invoked multiple times, it is recommended that each callback function be stored in a queue (such as the new org/forgerock/commons/ui/common/util/Queue facility) so that they all get called and in the order received. If the implementing product is making use of the default EVENT_SHOW_LOGIN_DIALOG implementation, then nothing needs to be changed in the product to work properly.

* Updating to Handlebars 4

The path to the new version of handlebars (4.0.5) will need to be adjusted in the root main.js.


## 9.x -> 10.x

* Ability to provide project-specific `KBADelegate`

Both OpenAM and OpenIDM need to provide a path to a `KBADelegate`, which can be either a project-specific or the commons one.


## 8.x -> 9.x

* Ability to pass (main) link filters to Navigation

The logic within `Navigation.js` that filters the master list of links based on various conditions (e.g. roles) has been factored out and is now provided to the Navigation component via a separate module.

The original behaviour is provided via the filter `org/forgerock/commons/ui/common/components/navigation/filters/RoleFilter`.

To use, add a new mapping to the RequireJS configuration:

```javascript
require.config({
    map: {
        "*" : {
            "NavigationFilter" : "org/forgerock/commons/ui/common/components/navigation/filters/RoleFilter"
            ...
```

For reference, OpenAM is using `org/forgerock/openam/ui/common/components/navigation/filters/RouteNavGroupFilter`.

* Introduction of new user role `ui-self-service-user`

Applications will need to add this role to any users that should be able to access the self-service (profile) pages.
