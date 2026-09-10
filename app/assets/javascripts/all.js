import { BrowseFilters } from "./components/browse-filters/browse-filters.js";
import { DepartmentList } from "./components/department-list/department-list.js";

const initAll = (options = {}) => {
  const $scope =
    options.scope instanceof HTMLElement ? options.scope : document;

  $scope
    .querySelectorAll('[data-module="tna-browse-filters"]')
    .forEach(($module) => new BrowseFilters($module));

  $scope
    .querySelectorAll('[data-module="tna-department-list"]')
    .forEach(($module) => new DepartmentList($module));
};

initAll();

export { initAll };
