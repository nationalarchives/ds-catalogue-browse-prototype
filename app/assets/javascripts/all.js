import { BrowseFilters } from "./components/browse-filters/browse-filters.js";
import { DepartmentList } from "./components/department-list/department-list.js";
import { Accordion } from "./components/etna-accordion/etna-accordion.js";

const initAll = (options = {}) => {
  const $scope =
    options.scope instanceof HTMLElement ? options.scope : document;

  $scope
    .querySelectorAll('[data-module="browse-filters"]')
    .forEach(($module) => new BrowseFilters($module));

  $scope
    .querySelectorAll('[data-module="department-list"]')
    .forEach(($module) => new DepartmentList($module));

  $scope
    .querySelectorAll('[data-module="etna-accordion"]')
    .forEach(($module) => new Accordion($module));
};

initAll();

export { initAll };
