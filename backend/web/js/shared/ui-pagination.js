/* ============================================================
 * UI Pagination Controller (v4.x)
 * ============================================================
 *
 * 用法：
 * const pager = createPagination({
 *   getPage: () => fxPage,
 *   setPage: v => fxPage = v,
 *   getPageSize: () => Number(fxPageSizeSelect.value),
 *   onPageChange: () => loadFixtureList(),
 *   els: {
 *     count: fxCount,
 *     pageNow: fxPageNow,
 *     pageMax: fxPageMax,
 *   }
 * })
 *
 * pager.render(total)
 * pager.go('next')
 */

function createPagination(options) {
  const {
    getPage,
    setPage,
    getPageSize,
    onPageChange,
    els,
  } = options;

  if (!getPage || !setPage || !getPageSize || !onPageChange) {
    throw new Error("[pagination] missing required options");
  }

  function render(total) {
    const pageSize = Number(getPageSize()) || 10;
    const max = Math.max(1, Math.ceil(total / pageSize));

    if (els?.count)   els.count.textContent = total;
    if (els?.pageMax) els.pageMax.textContent = max;

    let page = getPage();
    if (page > max) {
      page = max;
      setPage(page);
    }

    if (els?.pageNow) els.pageNow.textContent = page;
  }

  function go(action) {
    const max = Number(els?.pageMax?.textContent || 1);
    let page = getPage();

    if (action === "first") page = 1;
    if (action === "prev" && page > 1) page--;
    if (action === "next" && page < max) page++;
    if (action === "last") page = max;

    setPage(page);
    onPageChange();
  }

  return { render, go };
}

window.createPagination = createPagination;
