# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.0.0](https://github.com/valueadd-poland/va-schematics/compare/v2.0.1...v3.0.0) (2020-12-10)


### Bug Fixes

* **utils:** reduce call stack size when scanning project files ([044dade](https://github.com/valueadd-poland/va-schematics/commit/044dade56f70ee5c11b4e5ab2d0b6c3139338897))

### [2.0.1](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/compare/v2.0.0...v2.0.1) (2020-03-27)


### Bug Fixes

* **deps:** typescript dependency ([083ca73](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/083ca7310e8ddd6885b46a351adc248b00782f84))

## [2.0.0](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/compare/v1.0.0...v2.0.0) (2020-01-29)


### Features

* **project:** use Jest in generated tests ([a5ec783](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/a5ec783e5818493d4bd9015f4736bf183801c78e))

## 1.0.0 (2020-01-28)


### ⚠ BREAKING CHANGES

* remove Angular 7.x support

### Features

* **action:** add action schematic ([cadbeea](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/cadbeea43018efce1122acb88e5992ce5a71ec37))
* **action:** parse payload type ([770bba6](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/770bba6a60eeb672466bc3786c6444fd28228681))
* **action:** sync schema.json with interface ([d18711d](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/d18711d25cd34c264be1fadbf6fa0d1a7f9e6c0f))
* **crud:** actions, reducer and api methods ([b5f1706](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/b5f17069835af4ed4f3a9c5ee604f139c22b06fc))
* **crud:** change action names and add option for generating collection ([f1b9a7b](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/f1b9a7b3893b3ca12245c2725050b9b9488b8b80))
* **crud:** generate effect ([45c6028](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/45c6028cd074aca1f1848c48828c03d1f02180d9))
* **crud:** generate effects spec ([57287cc](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/57287cca5d0a5d9840cb9b371f98dad20de5d05b))
* **crud:** generating facade ([e7fe5d5](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/e7fe5d55f3fc5015219839aa15ff991a43787631))
* **crud:** generating facade spec ([a6a3065](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/a6a3065b2ff60685ee8e8ac38f10002cce08eb1a))
* **crud:** multiselect for operation ([23fa322](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/23fa3226b5285ab8e49e9f58237c4a697e85d145))
* **data-service:** add method schematic ([edf0496](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/edf04964cc322f3a555a84addba4ca936064753e))
* **data-service:** local storage backend ([09cb97e](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/09cb97ed23b2df8c72fa4b63b78a8a53278cb4bc))
* **ngrx:** add blank ngrx schematic ([b480ea9](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/b480ea91452b8070d241e4eaeffad4340ee84658))
* **ngrx:** basic ngrx generation ([a638bd8](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/a638bd880d2fcfcdfd76e8aff3bea9dfaebac8e2))
* **ngrx:** generating effects files ([3e314fb](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/3e314fb3625baf02365bd6ac257f761e908596e1))
* **ngrx:** generating facade files ([1cb2039](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/1cb20394f7096a2e9a7e121fcc48160727fdd864))
* **ngrx:** generating reducer files ([888516b](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/888516b068b90f0792e6f5c5d262e046ee3a9b05))
* **ngrx:** generating selectors files ([bf5ff97](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/bf5ff97bd851796fe2307dde45429be0d1fd0fcd))
* **reducer:** add reducer and selectors schematic ([f236279](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/f2362797dae04a20663cd1e3735b192ea6548035))
* **reducer:** check if selector exists ([913b408](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/913b408dc4a6f3492adf087438feddd8e3b2ff7e))
* **reducer:** generate facade selector and method ([afb9ece](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/afb9ece3dd9befed2d7d71b29b2184fb7d609733))
* **utils:** add basic utils ([4d4b854](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/4d4b85481fe457894d83122b629ba560d4565738))
* **utils:** cache in memory found entity path ([2e0f559](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/2e0f559f2f01997ac6bd6e14649ebb9da8f6e584))


### Bug Fixes

* **crud:** add missing imports to tests ([d599730](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/d599730890159d89e998e0e19974676754da9932))
* **crud:** collection name ([aba8293](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/aba8293669ef837b0b2de74087afe90c0d0430b1))
* **crud:** fix parsing response types ([bda69cb](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/bda69cb511e215a3d1864eba64ea5a059a92a96d))
* **crud:** test generation ([913ccaf](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/913ccaf4b401fbb270d0f3f56f37bb28e0b2b496))


### build

* update packages and add 8.x support ([d7ab057](https://patryk.zielinski93.github.com/valueadd-poland/va-schematics/commit/d7ab0573c2ea564fbfa7586a8eaa3ed352b48609))
