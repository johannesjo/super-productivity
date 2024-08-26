import { MarkedOptions, MarkedRenderer } from 'ngx-markdown';

export const markedOptionsFactory = (): MarkedOptions => {
  const renderer = new MarkedRenderer();

  renderer.checkbox = (isChecked: boolean) => {
    return `<span class="checkbox material-icons">${
      isChecked ? 'check_box ' : 'check_box_outline_blank '
    }</span>`;
  };
  renderer.listitem = (text: string) => {
    return text.includes('checkbox')
      ? '<li class="checkbox-wrapper">' + text + '</li>'
      : '<li>' + text + '</li>';
  };

  const linkRendererOld = renderer.link;
  renderer.link = (href, title, text) => {
    const html = linkRendererOld(href, title, text);
    return html.replace(/^<a /, '<a target="_blank" ');
  };
  renderer.paragraph = (text) => {
    const split = text.split('\n');
    return split.reduce((acc, p, i) => {
      const result = /h(\d)\./.exec(p);
      if (result !== null) {
        const h = `h${result[1]}`;
        return acc + `<${h}>${p.replace(result[0], '')}</${h}>`;
      }

      if (split.length === 1) {
        return `<p>` + p + `</p>`;
      }

      return acc ? (split.length - 1 === i ? acc + p + `</p>` : acc + p) : `<p>` + p;
    }, '');
  };
  return {
    renderer: renderer,
    gfm: true,
    breaks: false,
    pedantic: false,
    // smartLists: true,
    // smartypants: false,
  };
};
