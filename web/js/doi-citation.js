// DOI 引用生成器。功能封装在独立作用域中，避免与其他工具的函数和状态冲突。
(function () {
    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('doi-citation');
        if (!root) return;

        const form = document.getElementById('doi-form');
        const input = document.getElementById('doi-input');
        const queryButton = document.getElementById('doi-query-button');
        const statusBox = document.getElementById('doi-status');
        const metadataCard = document.getElementById('doi-metadata-card');
        const resultCard = document.getElementById('doi-result-card');
        const metadataGrid = document.getElementById('doi-metadata-grid');
        const citationList = document.getElementById('doi-citation-list');
        const rawJson = document.getElementById('doi-raw-json');
        const toast = document.getElementById('doi-toast');
        let currentResult = null;
        let toastTimer = null;

        const styleNames = {
            apa: 'APA 7th',
            ieee: 'IEEE',
            gbt: 'GB/T 7714',
            mla: 'MLA 9th',
            chicago: 'Chicago',
            bibtex: 'BibTeX',
            ris: 'RIS'
        };

        function normalizeDoi(value) {
            let doi = value.trim();
            doi = doi.replace(/^doi\s*:\s*/i, '');
            doi = doi.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '');
            doi = doi.replace(/[\s.,;]+$/g, '');
            return doi;
        }

        function isValidDoi(doi) {
            return /^10\.\d{4,9}\/\S+$/i.test(doi);
        }

        function clean(value) {
            if (value == null) return '';
            const holder = document.createElement('div');
            holder.innerHTML = String(value);
            return (holder.textContent || '').replace(/\s+/g, ' ').trim();
        }

        function first(value) {
            return Array.isArray(value) ? clean(value[0]) : clean(value);
        }

        function getYear(item) {
            const sources = [item.published, item['published-print'], item['published-online'], item.issued, item.created];
            for (const source of sources) {
                const year = source && source['date-parts'] && source['date-parts'][0] && source['date-parts'][0][0];
                if (year) return String(year);
            }
            return 'n.d.';
        }

        function authors(item) {
            return Array.isArray(item.author) ? item.author.map(author => ({
                family: clean(author.family) || clean(author.name) || 'Unknown',
                given: clean(author.given)
            })) : [];
        }

        function initials(given, spaced = false) {
            const values = clean(given).split(/[\s-]+/).filter(Boolean).map(part => {
                const match = part.match(/[\p{L}\p{N}]/u);
                return match ? match[0].toUpperCase() + '.' : '';
            }).filter(Boolean);
            return values.join(spaced ? ' ' : '');
        }

        function joinWithAnd(values, andWord = '&') {
            if (!values.length) return '';
            if (values.length === 1) return values[0];
            if (values.length === 2) return values[0] + ' ' + andWord + ' ' + values[1];
            return values.slice(0, -1).join(', ') + ', ' + andWord + ' ' + values[values.length - 1];
        }

        function apaAuthors(list) {
            if (!list.length) return 'Unknown author';
            const formatted = list.slice(0, 20).map(author => `${author.family}, ${initials(author.given, true)}`.trim());
            if (list.length > 20) return formatted.slice(0, 19).join(', ') + ', … ' + formatted[formatted.length - 1];
            return joinWithAnd(formatted, '&');
        }

        function ieeeAuthors(list) {
            if (!list.length) return 'Unknown author';
            const formatted = list.map(author => `${initials(author.given, true)} ${author.family}`.trim());
            if (formatted.length > 6) return formatted[0] + ' et al.';
            return joinWithAnd(formatted, 'and');
        }

        function gbtAuthors(list) {
            if (!list.length) return '佚名';
            const formatted = list.slice(0, 3).map(author => `${author.family.toUpperCase()} ${initials(author.given)}`.trim());
            return formatted.join(', ') + (list.length > 3 ? ', et al.' : '');
        }

        function mlaAuthors(list) {
            if (!list.length) return 'Unknown author';
            const firstAuthor = `${list[0].family}, ${list[0].given}`.replace(/,\s*$/, '');
            if (list.length === 1) return firstAuthor;
            if (list.length === 2) return `${firstAuthor}, and ${list[1].given} ${list[1].family}`.trim();
            return `${firstAuthor}, et al.`;
        }

        function chicagoAuthors(list) {
            if (!list.length) return 'Unknown author';
            const formatted = list.map((author, index) => index === 0
                ? `${author.family}, ${author.given}`.replace(/,\s*$/, '')
                : `${author.given} ${author.family}`.trim());
            if (formatted.length > 10) return formatted.slice(0, 7).join(', ') + ', et al.';
            return joinWithAnd(formatted, 'and');
        }

        function pageInfo(item) {
            return clean(item.page || item['article-number']);
        }

        function issueInfo(item) {
            const volume = clean(item.volume);
            const issue = clean(item.issue);
            if (volume && issue) return `${volume}(${issue})`;
            return volume || (issue ? `(${issue})` : '');
        }

        function sentence(value) {
            const text = clean(value);
            return text && !/[.!?。！？]$/.test(text) ? text + '.' : text;
        }

        function stripMarkup(value) {
            const holder = document.createElement('div');
            holder.innerHTML = value;
            return holder.textContent || '';
        }

        function bibEscape(value) {
            return clean(value).replace(/[{}]/g, match => '\\' + match);
        }

        function citationKey(list, year, title) {
            const family = (list[0] && list[0].family || 'unknown').replace(/[^\p{L}\p{N}]/gu, '');
            const word = clean(title).split(/\s+/).find(part => part.length > 3) || 'work';
            return (family + year + word).replace(/[^\p{L}\p{N}_-]/gu, '');
        }

        function buildBibtex(item, doi, list, title, journal, year, pages) {
            const map = {
                book: 'book',
                'book-chapter': 'incollection',
                'proceedings-article': 'inproceedings',
                dissertation: 'phdthesis',
                report: 'techreport'
            };
            const type = map[item.type] || 'article';
            const fields = [
                ['title', title],
                ['author', list.map(author => `${author.family}, ${author.given}`.replace(/,\s*$/, '')).join(' and ')],
                [type === 'article' ? 'journal' : 'booktitle', journal],
                ['year', year === 'n.d.' ? '' : year],
                ['volume', clean(item.volume)],
                ['number', clean(item.issue)],
                ['pages', pages],
                ['publisher', clean(item.publisher)],
                ['doi', doi],
                ['url', `https://doi.org/${doi}`]
            ].filter(([, value]) => value);
            const body = fields.map(([key, value]) => `  ${key} = {${bibEscape(value)}}`).join(',\n');
            return `@${type}{${citationKey(list, year, title)},\n${body}\n}`;
        }

        function buildRis(item, doi, list, title, journal, year, pages) {
            const typeMap = { book: 'BOOK', 'book-chapter': 'CHAP', 'proceedings-article': 'CPAPER', dissertation: 'THES', report: 'RPRT' };
            const rows = [`TY  - ${typeMap[item.type] || 'JOUR'}`];
            list.forEach(author => rows.push(`AU  - ${author.family}, ${author.given}`.replace(/,\s*$/, '')));
            rows.push(`TI  - ${title}`);
            if (journal) rows.push(`JO  - ${journal}`);
            if (year !== 'n.d.') rows.push(`PY  - ${year}`);
            if (item.volume) rows.push(`VL  - ${clean(item.volume)}`);
            if (item.issue) rows.push(`IS  - ${clean(item.issue)}`);
            if (pages) {
                const parts = pages.split('-');
                rows.push(`SP  - ${parts[0]}`);
                if (parts[1]) rows.push(`EP  - ${parts[1]}`);
            }
            if (item.publisher) rows.push(`PB  - ${clean(item.publisher)}`);
            rows.push(`DO  - ${doi}`, `UR  - https://doi.org/${doi}`, 'ER  - ');
            return rows.join('\n');
        }

        function buildCitations(item, doi) {
            const list = authors(item);
            const title = first(item.title) || 'Untitled';
            const journal = first(item['container-title']);
            const publisher = clean(item.publisher);
            const year = getYear(item);
            const volumeIssue = issueInfo(item);
            const pages = pageInfo(item);
            const url = `https://doi.org/${doi}`;
            const typeMarker = item.type === 'book' ? 'M' : (item.type === 'proceedings-article' ? 'C' : 'J');
            const apaTail = [journal ? `<i>${journal}</i>` : '', volumeIssue, pages].filter(Boolean).join(', ');
            const apa = `${apaAuthors(list)} (${year}). ${sentence(title)} ${apaTail ? apaTail + '. ' : ''}${url}`;
            const ieeeParts = [
                journal ? `“${title},” <i>${journal}</i>` : `“${title},”`,
                clean(item.volume) ? `vol. ${clean(item.volume)}` : '',
                clean(item.issue) ? `no. ${clean(item.issue)}` : '',
                pages ? `pp. ${pages}` : '', year || '', `doi: ${doi}`
            ].filter(Boolean);
            const ieee = `${ieeeAuthors(list)}, ${ieeeParts.join(', ')}.`;
            const gbtSource = journal || publisher || '在线文献';
            const gbtDetails = [year, clean(item.volume), clean(item.issue) ? `(${clean(item.issue)})` : ''].filter(Boolean).join(', ');
            const gbt = `${gbtAuthors(list)}. ${title}[${typeMarker}]. ${gbtSource}, ${gbtDetails}${pages ? ': ' + pages : ''}. DOI:${doi}.`;
            const mla = `${mlaAuthors(list)}. “${title}.” <i>${journal || publisher || 'Online publication'}</i>${volumeIssue ? ', ' + volumeIssue : ''}, ${year}${pages ? ', pp. ' + pages : ''}. DOI: ${doi}.`;
            const chicago = `${chicagoAuthors(list)}. “${title}.” <i>${journal || publisher || 'Online publication'}</i> ${volumeIssue ? volumeIssue + ' ' : ''}(${year})${pages ? ': ' + pages : ''}. ${url}.`;
            return {
                apa: stripMarkup(apa),
                ieee: stripMarkup(ieee),
                gbt,
                mla: stripMarkup(mla),
                chicago: stripMarkup(chicago),
                bibtex: buildBibtex(item, doi, list, title, journal, year, pages),
                ris: buildRis(item, doi, list, title, journal, year, pages)
            };
        }

        function setStatus(message, type = '') {
            statusBox.textContent = message;
            statusBox.className = type ? `status-${type}` : '';
        }

        function showMetadata(item, doi) {
            const list = authors(item);
            const values = [
                ['标题', first(item.title) || '未提供', true],
                ['作者', list.map(author => `${author.given} ${author.family}`.trim()).join('; ') || '未提供', true],
                ['期刊/出版物', first(item['container-title']) || '未提供'],
                ['出版年份', getYear(item)],
                ['卷（期）', issueInfo(item) || '未提供'],
                ['页码/文章号', pageInfo(item) || '未提供'],
                ['出版机构', clean(item.publisher) || '未提供'],
                ['文献类型', clean(item.type) || '未提供'],
                ['DOI', doi, true, `https://doi.org/${doi}`]
            ];
            metadataGrid.replaceChildren(...values.map(([label, value, wide, link]) => {
                const itemBox = document.createElement('div');
                itemBox.className = `doi-metadata-item${wide ? ' wide' : ''}`;
                const labelBox = document.createElement('span');
                labelBox.className = 'doi-metadata-label';
                labelBox.textContent = label;
                const valueBox = document.createElement('div');
                valueBox.className = 'doi-metadata-value';
                if (link) {
                    const anchor = document.createElement('a');
                    anchor.href = link;
                    anchor.target = '_blank';
                    anchor.rel = 'noopener noreferrer';
                    anchor.textContent = value;
                    valueBox.append(anchor);
                } else {
                    valueBox.textContent = value;
                }
                itemBox.append(labelBox, valueBox);
                return itemBox;
            }));
            rawJson.textContent = JSON.stringify(item, null, 2);
            metadataCard.classList.remove('hidden');
        }

        function showCitations(citations) {
            citationList.replaceChildren(...Object.entries(citations).map(([key, value]) => {
                const item = document.createElement('article');
                item.className = 'doi-citation-item';
                const head = document.createElement('div');
                head.className = 'doi-citation-head';
                const title = document.createElement('span');
                title.className = 'doi-citation-title';
                title.textContent = styleNames[key];
                const copy = document.createElement('button');
                copy.type = 'button';
                copy.className = 'btn-secondary btn-small';
                copy.textContent = '复制';
                copy.addEventListener('click', () => copyText(value, `${styleNames[key]} 已复制`));
                const output = document.createElement('pre');
                output.className = `doi-citation-output${key === 'bibtex' || key === 'ris' ? ' code' : ''}`;
                output.textContent = value;
                head.append(title, copy);
                item.append(head, output);
                return item;
            }));
            resultCard.classList.remove('hidden');
        }

        async function queryDoi(rawValue) {
            const doi = normalizeDoi(rawValue);
            input.value = doi;
            if (!isValidDoi(doi)) {
                setStatus('请输入有效 DOI，例如 10.1038/s41586-020-2649-2。', 'error');
                input.focus();
                return;
            }

            queryButton.disabled = true;
            metadataCard.classList.add('hidden');
            resultCard.classList.add('hidden');
            setStatus('正在查询 Crossref 元数据……', 'loading');
            try {
                const endpoint = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;
                const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
                if (response.status === 404) throw new Error('Crossref 中没有找到该 DOI。请检查 DOI 是否正确，或该 DOI 是否由其他注册机构管理。');
                if (!response.ok) throw new Error(`查询失败（HTTP ${response.status}），请稍后重试。`);
                const payload = await response.json();
                const item = payload && payload.message;
                if (!item) throw new Error('接口返回的数据格式不完整。');
                const citations = buildCitations(item, doi);
                currentResult = { doi, item, citations };
                showMetadata(item, doi);
                showCitations(citations);
                setStatus('查询成功，引用格式已生成。', 'success');
                const url = new URL(location.href);
                url.searchParams.set('doi', doi);
                url.hash = 'doi-citation';
                history.replaceState(null, '', url);
            } catch (error) {
                currentResult = null;
                setStatus(error.message || '查询失败，请检查网络连接后重试。', 'error');
            } finally {
                queryButton.disabled = false;
            }
        }

        async function copyText(value, message = '已复制') {
            try {
                await navigator.clipboard.writeText(value);
            } catch {
                const textarea = document.createElement('textarea');
                textarea.value = value;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.append(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
            }
            showToast(message);
        }

        function showToast(message) {
            toast.textContent = message;
            toast.classList.add('show');
            clearTimeout(toastTimer);
            toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
        }

        function safeFilename(value) {
            return value.replace(/[^a-z0-9._-]+/gi, '_').slice(0, 80) || 'citation';
        }

        function download(content, extension, mime) {
            if (!currentResult) return;
            const blob = new Blob([content], { type: mime });
            const anchor = document.createElement('a');
            anchor.href = URL.createObjectURL(blob);
            anchor.download = `${safeFilename(currentResult.doi)}.${extension}`;
            anchor.click();
            setTimeout(() => URL.revokeObjectURL(anchor.href), 1000);
        }

        form.addEventListener('submit', event => {
            event.preventDefault();
            queryDoi(input.value);
        });

        document.getElementById('doi-example-button').addEventListener('click', () => {
            input.value = '10.1038/s41586-020-2649-2';
            queryDoi(input.value);
        });

        document.getElementById('doi-clear-button').addEventListener('click', () => {
            input.value = '';
            currentResult = null;
            metadataCard.classList.add('hidden');
            resultCard.classList.add('hidden');
            setStatus('');
            const url = new URL(location.href);
            url.searchParams.delete('doi');
            url.hash = 'doi-citation';
            history.replaceState(null, '', url);
            input.focus();
        });

        document.getElementById('doi-copy-all-button').addEventListener('click', () => {
            if (!currentResult) return;
            const content = Object.entries(currentResult.citations)
                .map(([key, value]) => `${styleNames[key]}\n${value}`)
                .join('\n\n');
            copyText(content, '全部引用已复制');
        });

        document.getElementById('doi-download-txt-button').addEventListener('click', () => {
            if (!currentResult) return;
            const content = Object.entries(currentResult.citations)
                .map(([key, value]) => `${styleNames[key]}\n${value}`)
                .join('\n\n');
            download(content, 'txt', 'text/plain;charset=utf-8');
        });

        document.getElementById('doi-download-bib-button').addEventListener('click', () => {
            if (currentResult) download(currentResult.citations.bibtex, 'bib', 'application/x-bibtex;charset=utf-8');
        });

        document.getElementById('doi-download-ris-button').addEventListener('click', () => {
            if (currentResult) download(currentResult.citations.ris, 'ris', 'application/x-research-info-systems;charset=utf-8');
        });

        const doiFromUrl = new URL(location.href).searchParams.get('doi');
        if (doiFromUrl) {
            if (window.researchToolsNavigation) window.researchToolsNavigation.openTool('doi-citation', false);
            input.value = doiFromUrl;
            queryDoi(doiFromUrl);
        }
    });
}());
