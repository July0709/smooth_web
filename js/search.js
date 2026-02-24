let chapters = [];
let chapterTexts = [];
let fuse = null;

// 加载所有章节数据
function loadAllChapters(callback) {
  const startTime = performance.now();
  
  fetch('/chapters.json')
    .then(res => res.json())
    .then(list => {
      chapters = list;
      console.log(`📦 Loaded ${list.length} chapters in ${(performance.now() - startTime).toFixed(0)}ms`);
      
      renderToc();
      
      console.log('📄 Loading text files for search...');
      const promises = chapters.map(chap =>
        fetch(chap.text)
          .then(res => res.text())
          .then(text => ({ ... chap, text }))
          .catch(() => ({ ...chap, text: "" }))
      );
      
      Promise.all(promises).then(results => {
        chapterTexts = results;
        buildIndex();
        console.log(`✅ Search index ready (${(performance.now() - startTime).toFixed(0)}ms)`);
        if (callback) callback();
      });
    })
    .catch(err => {
      console.error('❌ Failed to load chapters:', err);
      document.getElementById('tocGrid').innerHTML = 
        '<p class="no-results">无法加载数据，请检查 chapters.json 文件</p>';
    });
}

function buildIndex() {
  fuse = new Fuse(chapterTexts, {
    keys: ["title", "text", "category"],
    includeMatches: true,
    threshold:  0.4,
    minMatchCharLength: 2,
    ignoreLocation: true,
  });
}

function doSearch() {
  const query = document. getElementById("searchBox").value.trim();
  const resultsDiv = document.getElementById("searchResults");
  const tocGrid = document.getElementById("tocGrid");
  
  if (!query) {
    resultsDiv.innerHTML = "";
    tocGrid.style.display = "grid";
    return;
  }
  
  if (! fuse) {
    resultsDiv.innerHTML = '<p class="loading">⏳ 搜索索引加载中，请稍候...</p>';
    tocGrid. style.display = "none";
    return;
  }
  
  const results = fuse. search(query);
  
  if (results.length === 0) {
    resultsDiv.innerHTML = `<p class="no-results">未找到包含 "${query}" 的内容<br><small>试试其他关键词</small></p>`;
    tocGrid.style.display = "none";
    return;
  }
  
  let html = results.map(r => {
    const item = r.item;
    const preview = getPreview(item.text, query);
    
    return `
      <div class="result-item" onclick="window.location.href='${item.html}'">
        <div class="result-title">${highlightText(item.title, query)}</div>
        <div class="result-preview">${preview}</div>
        ${item.category ? `<div class="result-meta">📁 ${item.category}</div>` : ''}
      </div>
    `;
  }).join('');
  
  resultsDiv.innerHTML = html;
  tocGrid.style.display = "none";
}

function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<span class="highlight">$1</span>');
}

function getPreview(text, query, contextLength = 100) {
  if (!text) return "暂无内容预览";
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index === -1) {
    return text. substring(0, 150) + "...";
  }
  
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + query.length + contextLength);
  const snippet = text.substring(start, end);
  
  return (start > 0 ?  "..." : "") + 
         highlightText(snippet, query) + 
         (end < text. length ?  "..." : "");
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderToc() {
  const tocGrid = document.getElementById("tocGrid");
  
  if (chapters.length === 0) {
    tocGrid.innerHTML = '<p class="loading">📚 加载中... </p>';
    return;
  }
  
  let html = chapters.map(chap => `
    <div class="chapter-card" onclick="window.location.href='${chap.html}'">
      <img src="${chap.image}" alt="${chap.title}" 
           onerror="this. src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 400 300%27%3E%3Crect fill=%27%23ecf0f1%27 width=%27400%27 height=%27300%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 text-anchor=%27middle%27 fill=%27%237f8c8d%27 font-size=%2720%27%3E暂无图片%3C/text%3E%3C/svg%3E'">
      <h3>${chap.title}</h3>
    </div>
  `).join('');
  
  tocGrid.innerHTML = html;
}

window.addEventListener('DOMContentLoaded', () => {
  loadAllChapters();
});
