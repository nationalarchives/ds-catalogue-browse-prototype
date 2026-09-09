import { BrowseFilters } from "./components/browse-filters/browse-filters.js";

const initAll = (options = {}) => {
  const $scope =
    options.scope instanceof HTMLElement ? options.scope : document;

  $scope
    .querySelectorAll('[data-module="tna-browse-filters"]')
    .forEach(($module) => new BrowseFilters($module));
};

initAll();

export { initAll };
