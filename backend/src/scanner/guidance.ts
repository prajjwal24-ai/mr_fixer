import type { CodeExample, FurtherGuidance } from '../types.js';

export interface FindingGuidance {
  whatIsWrong: string;
  whyItMatters: string;
  stepByStepFix: string[];
  codeExample?: CodeExample;
  furtherGuidance?: FurtherGuidance;
  helpUrl?: string;
}

const DEFAULT_DOC_URLS: Record<string, string> = {
  'button-name': 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
  'input-button-name': 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
  'label': 'https://www.w3.org/WAI/tutorials/forms/labels/',
  'aria-input-field-name': 'https://www.w3.org/WAI/tutorials/forms/labels/',
  'select-name': 'https://www.w3.org/WAI/tutorials/forms/labels/',
  'image-alt': 'https://www.w3.org/WAI/tutorials/images/',
  'color-contrast': 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
  'heading-order': 'https://www.w3.org/WAI/tutorials/page-structure/headings/',
  'page-has-heading-one': 'https://www.w3.org/WAI/tutorials/page-structure/headings/',
  'mobile-horizontal-overflow': 'https://www.w3.org/WAI/WCAG21/Understanding/reflow.html',
};

/**
 * Returns structured, beginner-friendly repair guidance, safe code examples,
 * and multi-level explanations tailored to the specific rule and context.
 */
export function getFindingGuidance(
  ruleId: string,
  snippet?: string,
  _selector?: string,
  axeHelpUrl?: string
): FindingGuidance {
  const helpUrl = axeHelpUrl || DEFAULT_DOC_URLS[ruleId] || 'https://www.w3.org/WAI/standards-guidelines/wcag/';

  switch (ruleId) {
    case 'button-name':
    case 'input-button-name': {
      return {
        whatIsWrong: 'The button does not have an accessible name that screen readers and assistive tools can announce.',
        whyItMatters:
          'When screen reader users navigate by buttons, a nameless button is announced only as "button" or an unhelpful generic sound. Users cannot tell if clicking it will submit a payment, delete data, or open a menu.',
        stepByStepFix: [
          'If the button contains visible text, ensure the text is not hidden with CSS (display: none or visibility: hidden) and is not inside an aria-hidden container.',
          'If the button is icon-only (e.g. an SVG or font icon), add an aria-label attribute describing the action (e.g., aria-label="Close menu").',
          'Add aria-hidden="true" to the inner decorative icon tag so assistive technology ignores the graphic code.',
          'If another visible text element on the page describes the button, you can link them using aria-labelledby="id-of-text".',
        ],
        codeExample: {
          before: `<button class="icon-btn">\n  <svg class="icon-trash">...</svg>\n</button>`,
          after: `<button class="icon-btn" aria-label="Delete item">\n  <svg class="icon-trash" aria-hidden="true">...</svg>\n</button>`,
          explanation:
            'Adding aria-label gives the button a clear, spoken name. Setting aria-hidden="true" on the inner SVG prevents screen readers from reading meaningless graphic nodes.',
        },
        furtherGuidance: {
          simplerExplanation:
            'Imagine browsing a website with your eyes closed. When your finger touches a button, your phone only says "Button". You wouldn\'t know if pressing it buys an item, deletes your cart, or closes the window! Adding an accessible label gives the button a voice.',
          alternativeExample:
            `<!-- Visually hidden text alternative (useful for automatic translation tools) -->\n<button class="icon-btn">\n  <span class="sr-only">Delete item</span>\n  <svg aria-hidden="true">...</svg>\n</button>`,
          frameworkGuidance: {
            react: `<button type="button" aria-label="Close dialog" onClick={onClose}>\n  <CloseIcon aria-hidden="true" />\n</button>`,
            vue: `<button type="button" aria-label="Close dialog" @click="onClose">\n  <CloseIcon aria-hidden="true" />\n</button>`,
            tailwind: `<button type="button" aria-label="Delete item" class="p-2 text-slate-400 hover:text-white rounded-md">\n  <TrashIcon aria-hidden="true" class="w-5 h-5" />\n</button>`,
          },
        },
        helpUrl,
      };
    }

    case 'label':
    case 'aria-input-field-name':
    case 'select-name': {
      return {
        whatIsWrong: 'The form input or control does not have an associated accessible label.',
        whyItMatters:
          'Without a label, screen readers announce "text edit" without explaining what information is expected. Furthermore, clicking on a proper <label> expands the clickable touch area, greatly helping users with motor challenges or mobile devices.',
        stepByStepFix: [
          'Add a visible <label> element with a for attribute matching the input\'s id attribute (e.g. <label for="email">Email</label>).',
          'Do NOT rely on placeholder alone—placeholders disappear when users start typing and often fail color contrast requirements.',
          'If design constraints strictly forbid a visible label, use aria-label="Descriptive name" or wrap the label text in a CSS screen-reader-only class (.sr-only).',
        ],
        codeExample: {
          before: `<input type="email" placeholder="Your email address">`,
          after: `<label for="user-email">Email Address</label>\n<input type="email" id="user-email" name="email" placeholder="e.g. jane@example.com">`,
          explanation:
            'The for attribute links the label directly to the input id. Clicking the text focuses the input, and assistive devices read the label immediately upon focus.',
        },
        furtherGuidance: {
          simplerExplanation:
            'A label is the title on a form field. Without one, anyone who cannot see the screen hears only "blank text box", with no way to know whether the site wants their name, phone number, or password.',
          alternativeExample:
            `<!-- Accessible hidden label if design has no room for visible text -->\n<label for="search-input" class="sr-only">Search our documentation</label>\n<input id="search-input" type="search" placeholder="Search...">`,
          frameworkGuidance: {
            react: `<div className="flex flex-col gap-1">\n  <label htmlFor="user-name">Full Name</label>\n  <input id="user-name" type="text" value={name} onChange={e => setName(e.target.value)} />\n</div>`,
            vue: `<div class="form-group">\n  <label for="user-name">Full Name</label>\n  <input id="user-name" type="text" v-model="name" />\n</div>`,
            tailwind: `<label for="email" class="block text-sm font-medium text-slate-300 mb-1">Email</label>\n<input id="email" class="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md" />`,
          },
        },
        helpUrl,
      };
    }

    case 'image-alt': {
      return {
        whatIsWrong: 'The <img> element is missing an alt attribute.',
        whyItMatters:
          'When an image lacks an alt attribute, screen readers typically read out the raw image filename or full URL (e.g. "image slash uploads slash img902 dot jpg"), creating disorientation and noise.',
        stepByStepFix: [
          'Step 1: Determine if the image is informative or decorative.',
          'If informative (photographs, diagrams, screenshots, icons that convey status): add a concise description in alt="...".',
          'If purely decorative (decorative borders, background flourishes, visual spacer icons): specify an empty alt="" and role="presentation".',
          'Avoid redundant words like "photo of" or "image of"—screen readers automatically announce that the element is an image.',
        ],
        codeExample: {
          before: `<img src="/images/hero-card.png">`,
          after: `<!-- For informative images: -->\n<img src="/images/hero-card.png" alt="Annual customer satisfaction chart showing 94% approval">\n\n<!-- For decorative images: -->\n<img src="/images/hero-card.png" alt="" role="presentation">`,
          explanation:
            'Human judgment is needed to decide between informative alt text and decorative alt="". Never guess: if the image communicates facts, describe it; if it is eye candy, hide it with alt="".',
        },
        furtherGuidance: {
          simplerExplanation:
            'Alt text is a spoken caption for an image. If someone cannot see the screen, their device reads this text aloud. If the picture is just pretty decoration with no important facts, empty alt="" tells the device: "Skip this picture, it\'s just decoration."',
          alternativeExample:
            `<!-- Linked image acting as a button or link -->\n<a href="/profile">\n  <img src="avatar.jpg" alt="View Alex's profile">\n</a>`,
          frameworkGuidance: {
            react: `<img\n  src={item.src}\n  alt={item.isDecorative ? "" : item.description}\n  role={item.isDecorative ? "presentation" : undefined}\n/>`,
            vue: `<img :src="item.src" :alt="item.isDecorative ? '' : item.description" />`,
            tailwind: `<img src="/banner.jpg" alt="Summer sale promotion" class="w-full h-auto rounded-lg shadow-md" />`,
          },
        },
        helpUrl,
      };
    }

    case 'color-contrast': {
      return {
        whatIsWrong: 'The contrast ratio between text foreground and background is below the WCAG 2.1 AA minimum threshold.',
        whyItMatters:
          'Low-contrast text is difficult or impossible to read for users with low vision, color vision deficiencies, aging eyes, or anyone viewing a screen outdoors under direct sunlight.',
        stepByStepFix: [
          'Measure the hex color of the text and the hex color of the background behind it.',
          'Standard text (< 18pt or < 14pt bold) requires at least a 4.5:1 contrast ratio.',
          'Large text (>= 18pt or >= 14pt bold) requires at least a 3:1 contrast ratio.',
          'Adjust the foreground lightness or darken the background until the contrast ratio meets or exceeds 4.5:1.',
          'Note: Automated contrast checks cannot reliably test text over gradients or background photos; visually inspect these cases manually.',
        ],
        codeExample: {
          before: `/* Contrast ~2.3:1 (FAILS WCAG AA 4.5:1 standard) */\n.caption {\n  color: #a0a0a0;\n  background-color: #ffffff;\n}`,
          after: `/* Contrast ~4.6:1 (PASSES WCAG AA standard) */\n.caption {\n  color: #595959;\n  background-color: #ffffff;\n}`,
          explanation:
            'Darkening the gray text from #a0a0a0 to #595959 elevates the contrast ratio above the required 4.5:1 baseline. The exact hex color depends on your brand palette.',
        },
        furtherGuidance: {
          simplerExplanation:
            'Think of light gray writing on a white paper. It strains your eyes and is hard to read. WCAG contrast rules ensure that text stands out boldly from the background so everyone can read it effortlessly.',
          alternativeExample:
            `/* For dark mode surfaces (#0f172a): */\n/* Bad: #64748b (~3.2:1) */\n/* Good: #cbd5e1 (~10.2:1) */\n.dark-subtext {\n  color: #cbd5e1;\n  background-color: #0f172a;\n}`,
          frameworkGuidance: {
            react: `// Choose semantic tokens with verified contrast\n<p className="text-slate-700 dark:text-slate-200">High contrast readable text</p>`,
            vue: `<p class="text-slate-700 dark:text-slate-200">High contrast readable text</p>`,
            tailwind: `<!-- Avoid text-slate-400 on white backgrounds; use text-slate-700 or text-slate-800 -->\n<p class="text-slate-700 bg-white">Body content with 7:1 contrast ratio</p>`,
          },
        },
        helpUrl,
      };
    }

    case 'heading-order':
    case 'page-has-heading-one': {
      const isMissingH1 = ruleId === 'page-has-heading-one';
      return {
        whatIsWrong: isMissingH1
          ? 'The webpage is missing a top-level <h1> heading.'
          : 'Headings do not follow a sequential, descending order (for example, skipping from <h1> directly to <h3>).',
        whyItMatters:
          'Screen reader users rely on headings as their primary table of contents to quickly skim and jump across sections. Skipping levels or omitting <h1> disorients users and breaks their mental model of the page layout.',
        stepByStepFix: [
          'Ensure the page has exactly one top-level <h1> heading that describes the primary topic or purpose of the page.',
          'Organize major sections under <h2> headings.',
          'Subdivide sections using <h3>, then <h4>, without skipping levels.',
          'Never pick a heading tag just because of its default visual font size—use CSS classes for styling while keeping HTML tags semantically correct.',
        ],
        codeExample: {
          before: `<h1>Documentation Hub</h1>\n<h3>Getting Started</h3> <!-- Skipped h2! -->`,
          after: `<h1>Documentation Hub</h1>\n<h2>Installation</h2>\n<h3>Getting Started</h3>`,
          explanation:
            'Ensure heading levels increase by at most one level at a time. Style headings visually using CSS utility classes rather than choosing the wrong HTML tag.',
        },
        furtherGuidance: {
          simplerExplanation:
            'Think of a book outline: Chapter 1 (h1) -> Section A (h2) -> Subsection i (h3). If a book skipped straight from Chapter 1 to Subsection i without a Section name, readers would wonder if pages were missing!',
          alternativeExample:
            `<!-- Visual size can differ from semantic level -->\n<h2 class="text-sm uppercase font-bold text-slate-400">\n  Small Section Header\n</h2>`,
          frameworkGuidance: {
            react: `<main>\n  <h1>Dashboard</h1>\n  <section aria-labelledby="analytics-heading">\n    <h2 id="analytics-heading">Weekly Analytics</h2>\n  </section>\n</main>`,
            vue: `<main>\n  <h1>Dashboard</h1>\n  <h2>Weekly Analytics</h2>\n</main>`,
            tailwind: `<h1 class="text-3xl font-extrabold text-white">Title</h1>\n<h2 class="text-xl font-semibold text-slate-200 mt-6">Section</h2>`,
          },
        },
        helpUrl,
      };
    }

    case 'mobile-horizontal-overflow': {
      return {
        whatIsWrong: 'Content exceeds the mobile viewport width (375px), triggering an unintended horizontal scrollbar.',
        whyItMatters:
          'Horizontal scrolling on mobile devices frustrates users, causes accidental navigation swipes, breaks responsive reading flow, and creates severe usability barriers for users with motor limitations.',
        stepByStepFix: [
          'Locate the offending element identified in the selector and evidence box.',
          'Replace fixed pixel widths (e.g. width: 600px) with responsive widths (width: 100%; max-width: 600px).',
          'Add box-sizing: border-box so padding and borders do not expand the element beyond 100% width.',
          'Add overflow-wrap: break-word to containers with long text or URLs to prevent long unbreakable strings from pushing containers wide.',
        ],
        codeExample: {
          before: `.container {\n  width: 500px; /* Overflows 375px mobile screens! */\n}`,
          after: `.container {\n  width: 100%;\n  max-width: 500px;\n  box-sizing: border-box;\n}`,
          explanation:
            'Using width: 100% with max-width allows the element to shrink smoothly on mobile devices down to 375px while maintaining its full width on large screens.',
        },
        furtherGuidance: {
          simplerExplanation:
            'Putting an 8-inch photo in a 4-inch frame causes the photo to spill out over the edges. When a website box has a fixed width wider than a phone screen, users are forced to scroll sideways back and forth.',
          alternativeExample:
            `/* For tables or data grids that genuinely need wide space: */\n.table-wrapper {\n  width: 100%;\n  overflow-x: auto;\n  -webkit-overflow-scrolling: touch;\n}`,
          frameworkGuidance: {
            react: `<div className="w-full max-w-lg box-border px-4">\n  <ResponsiveContent />\n</div>`,
            vue: `<div class="w-full max-w-lg box-border px-4">\n  <ResponsiveContent />\n</div>`,
            tailwind: `<div class="w-full max-w-md mx-auto p-4 box-border break-words">\n  <!-- Fluid container that never overflows 375px -->\n</div>`,
          },
        },
        helpUrl,
      };
    }

    case 'link-name': {
      return {
        whatIsWrong: 'The link has no discernible text or label that screen readers can announce.',
        whyItMatters:
          'Screen reader users often browse pages by tabbing through links or pulling up a links list. Without text or an accessible name, the link is announced only as "link" or reads an unhelpful URL string.',
        stepByStepFix: [
          'Add meaningful visible text inside the <a> element describing the link destination or purpose.',
          'If the link is icon-only, add an aria-label attribute (e.g. aria-label="Visit our GitHub repository").',
          'If the link wraps an image, ensure the image has a descriptive alt attribute.',
        ],
        codeExample: {
          before: `<a href="/settings">\n  <svg class="gear-icon">...</svg>\n</a>`,
          after: `<a href="/settings" aria-label="Account Settings">\n  <svg class="gear-icon" aria-hidden="true">...</svg>\n</a>`,
          explanation: 'Adding aria-label gives the icon link a clear voice, while aria-hidden="true" silences the SVG icon nodes.',
        },
        furtherGuidance: {
          simplerExplanation:
            'Imagine highway signposts that are completely blank. You would have no idea which exit to take! Accessible link names tell users where clicking the link will take them.',
        },
        helpUrl,
      };
    }

    case 'html-has-lang':
    case 'html-lang-valid': {
      return {
        whatIsWrong: 'The <html> element does not have a valid lang attribute specifying the natural language of the document.',
        whyItMatters:
          'Screen readers use the document language to select the correct synthetic voice, pronunciation dictionary, and accent. Without it, English speech synthesizers will mispronounce foreign languages or speak with severe distortion.',
        stepByStepFix: [
          'Locate the opening <html> tag in your root HTML template or document layout.',
          'Add a valid BCP 47 language code attribute (e.g., <html lang="en"> for English, <html lang="es"> for Spanish).',
          'If sections of the document use a different language, override with a local lang attribute on that container.',
        ],
        codeExample: {
          before: `<!DOCTYPE html>\n<html>\n<head>...`,
          after: `<!DOCTYPE html>\n<html lang="en">\n<head>...`,
          explanation: 'Declaring lang="en" allows browser translation tools and screen reader vocal engines to process the page accurately.',
        },
        furtherGuidance: {
          simplerExplanation:
            'A screen reader needs to know what language your page is written in so it knows whether to read words using English phonetics, French phonetics, or Japanese phonetics.',
        },
        helpUrl,
      };
    }

    case 'duplicate-id-active': {
      return {
        whatIsWrong: 'An id attribute value is used more than once on focusable or active interactive elements.',
        whyItMatters:
          'HTML IDs must be unique. When IDs are duplicated, screen reader ARIA references (like aria-labelledby or aria-describedby) and label for="id" bindings bind unpredictably to the first instance in the DOM.',
        stepByStepFix: [
          'Search your codebase for multiple instances of the reported id.',
          'Make each ID unique across the entire DOM tree, or convert repetitive styling hooks from IDs to CSS classes.',
          'Update any corresponding label for="..." or aria-labelledby="..." attributes to point to the unique ID.',
        ],
        codeExample: {
          before: `<button id="submit-btn">Save</button>\n<button id="submit-btn">Cancel</button>`,
          after: `<button id="save-btn">Save</button>\n<button id="cancel-btn">Cancel</button>`,
          explanation: 'Giving each active element a distinct ID prevents focus ambiguity and invalid label references.',
        },
        furtherGuidance: {
          simplerExplanation:
            'If two students in the same class have the exact same first and last name and student ID number, calling their ID causes confusion. Every active element on a page needs its own unique identifier.',
        },
        helpUrl,
      };
    }

    case 'landmark-one-main': {
      return {
        whatIsWrong: 'The webpage does not contain a single top-level <main> landmark element.',
        whyItMatters:
          'Assistive technology users rely on landmarks to bypass repetitive header navigation, banners, and sidebars and jump directly to the primary page content.',
        stepByStepFix: [
          'Wrap the central content of the page in a <main> element.',
          'Ensure there is only one visible <main> element per document.',
          'Do not place <main> inside an <article>, <aside>, <footer>, <header>, or <nav> tag.',
        ],
        codeExample: {
          before: `<header>Nav</header>\n<div class="content">\n  <h1>Article</h1>\n</div>\n<footer>Foot</footer>`,
          after: `<header>Nav</header>\n<main>\n  <h1>Article</h1>\n</main>\n<footer>Foot</footer>`,
          explanation: 'Using the semantic <main> tag designates the primary page content as an accessible landmark.',
        },
        furtherGuidance: {
          simplerExplanation:
            'The <main> tag is like the table of contents bookmark that says: "This is the real body of the page, skip past all the navigation menus and ads to get here."',
        },
        helpUrl,
      };
    }

    case 'document-title': {
      return {
        whatIsWrong: 'The webpage is missing a <title> tag, or uses a generic, uninformative title.',
        whyItMatters:
          'The document title is the first thing read by screen readers when a page loads and appears as the browser tab name and search engine listing. Without a specific title, users cannot distinguish between tabs.',
        stepByStepFix: [
          'Add a descriptive, concise <title> inside the <head> element.',
          'Follow the recommended pattern: "Page Name — Site Name" (e.g. "Pricing — Acme Corp").',
          'Keep the title unique across different pages of the website.',
        ],
        codeExample: {
          before: `<head>\n  <meta charset="UTF-8">\n</head>`,
          after: `<head>\n  <meta charset="UTF-8">\n  <title>Customer Dashboard — Acme Analytics</title>\n</head>`,
          explanation: 'A descriptive title tells users what page they are on as soon as they navigate or switch tabs.',
        },
        furtherGuidance: {
          simplerExplanation:
            'The title tag is the label printed on the spine of a book. Without it, you cannot tell which book you are opening from your shelf.',
        },
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html',
      };
    }

    case 'meta-description': {
      return {
        whatIsWrong: 'The webpage is missing a <meta name="description"> tag.',
        whyItMatters:
          'Search engines use meta descriptions to generate the snippet snippet under your search result. Missing descriptions lead to search engines extracting random text snippets from your page.',
        stepByStepFix: [
          'Add a <meta name="description" content="..."> tag inside the <head> of your document.',
          'Write a concise, compelling summary between 120 and 160 characters describing the page.',
        ],
        codeExample: {
          before: `<head>\n  <title>Acme Tools</title>\n</head>`,
          after: `<head>\n  <title>Acme Tools</title>\n  <meta name="description" content="High performance developer tools and real-time accessibility auditing for modern web teams.">\n</head>`,
          explanation: 'Search crawlers display this meta description directly in search results.',
        },
        furtherGuidance: {
          simplerExplanation:
            'A meta description is the short summary paragraph shown under your link in Google search results. Without one, Google will just guess what your page is about.',
        },
        helpUrl: 'https://developers.google.com/search/docs/crawling-indexing/special-tags',
      };
    }

    case 'meta-viewport-scalable': {
      return {
        whatIsWrong: 'The viewport meta tag is missing or restricts pinch-to-zoom scaling (user-scalable=no or maximum-scale=1).',
        whyItMatters:
          'Users with visual impairments rely on pinch-to-zoom on mobile devices to enlarge text and buttons. Blocking zoom violates WCAG 1.4.4 (Resize Text).',
        stepByStepFix: [
          'Inspect the <meta name="viewport"> tag in your <head>.',
          'Remove user-scalable=no, user-scalable=0, and maximum-scale=1.',
          'Set content="width=device-width, initial-scale=1.0".',
        ],
        codeExample: {
          before: `<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">`,
          after: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
          explanation: 'Removing user-scalable=no restores pinch-to-zoom capability across all mobile browsers.',
        },
        furtherGuidance: {
          simplerExplanation:
            'Disabling zoom on a smartphone prevents anyone who struggles to see small text from enlarging it, locking them out of reading your content.',
        },
        helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html',
      };
    }

    case 'security-nosniff': {
      return {
        whatIsWrong: 'The HTTP response header "X-Content-Type-Options: nosniff" is missing.',
        whyItMatters:
          'Without this header, older or misconfigured browsers may attempt to MIME-sniff response content, potentially executing untrusted user-uploaded images or text as executable JavaScript.',
        stepByStepFix: [
          'Configure your HTTP server, edge proxy (e.g. Nginx, Cloudflare), or backend framework to send this header on all responses.',
          'In Node.js Express, use the helmet middleware: app.use(helmet.noSniff()).',
          'In Nginx, add: add_header X-Content-Type-Options nosniff always;',
        ],
        codeExample: {
          before: `// Missing header in server response`,
          after: `// HTTP Response Headers:\nX-Content-Type-Options: nosniff`,
          explanation: 'The nosniff directive instructs the browser to strictly follow the Content-Type header declared by the server.',
        },
        furtherGuidance: {
          simplerExplanation:
            'This header prevents browsers from guessing what type of file was sent. It prevents a malicious user from uploading an image that the browser secretly executes as code.',
        },
        helpUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options',
      };
    }

    case 'security-clickjacking': {
      return {
        whatIsWrong: 'The webpage lacks defensive headers preventing unauthorized embedding in iframes (clickjacking).',
        whyItMatters:
          'An attacker can embed your page inside a transparent <iframe> on a malicious website, tricking users into clicking buttons they cannot see (clickjacking attack).',
        stepByStepFix: [
          'Add the Content-Security-Policy header with frame-ancestors: frame-ancestors \'self\'.',
          'For legacy browser support, also send: X-Frame-Options: SAMEORIGIN or DENY.',
          'In Express, helmet provides this automatically via helmet.frameguard().',
        ],
        codeExample: {
          before: `// No framing restrictions sent`,
          after: `Content-Security-Policy: frame-ancestors 'self';\nX-Frame-Options: SAMEORIGIN`,
          explanation: 'These headers restrict which domains are permitted to embed your website in an iframe.',
        },
        furtherGuidance: {
          simplerExplanation:
            'Clickjacking is like placing an invisible button over a website. When a user clicks what looks like a game, they actually clicked "Delete Account" on your site.',
        },
        helpUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options',
      };
    }

    case 'security-hsts': {
      return {
        whatIsWrong: 'The HTTPS webpage does not send a Strict-Transport-Security (HSTS) header.',
        whyItMatters:
          'HSTS informs browsers that the website must only be accessed over secure HTTPS connections, preventing man-in-the-middle SSL-stripping attacks on subsequent visits.',
        stepByStepFix: [
          'Ensure your website has a valid SSL/TLS certificate.',
          'Configure your server to send: Strict-Transport-Security: max-age=31536000; includeSubDomains',
        ],
        codeExample: {
          before: `// Plain HTTPS response without HSTS`,
          after: `Strict-Transport-Security: max-age=31536000; includeSubDomains`,
          explanation: 'max-age=31536000 enforces HTTPS exclusively for at least 1 year.',
        },
        furtherGuidance: {
          simplerExplanation:
            'HSTS tells the user\'s web browser: "Never connect to this website using unencrypted HTTP, even if the user accidentally types http://."',
        },
        helpUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security',
      };
    }

    case 'performance-slow-ttfb': {
      return {
        whatIsWrong: 'Time to First Byte (TTFB) exceeds 1800ms, indicating severe initial server or network latency.',
        whyItMatters:
          'TTFB is the initial bottleneck for all page rendering. High TTFB delays DOM parsing, style evaluation, and image loading, resulting in poor user experience and lower search rankings.',
        stepByStepFix: [
          'Check database query performance and server-side rendering logic.',
          'Enable edge caching (CDN) for static and semi-static HTML pages.',
          'Implement gzip or brotli compression and HTTP/2 or HTTP/3 multiplexing.',
        ],
        codeExample: {
          before: `// Server response time > 1800ms`,
          after: `// Target TTFB: < 800ms (Good: < 200ms)`,
          explanation: 'Optimizing backend queries and leveraging edge caching reduces the roundtrip wait time before the first byte arrives.',
        },
        furtherGuidance: {
          simplerExplanation:
            'TTFB is how long you wait after ringing the doorbell before someone opens the door. If the wait is long, visitors will give up and leave before seeing anything.',
        },
        helpUrl: 'https://web.dev/articles/ttfb',
      };
    }

    default: {
      return {
        whatIsWrong: `The element violated WCAG rule "${ruleId}". Inspect the HTML node and failure summary.`,
        whyItMatters:
          'Accessibility standards ensure all users, including those using screen readers, keyboard navigation, or screen magnifiers, can perceive and operate the webpage.',
        stepByStepFix: [
          'Review the measured evidence and HTML snippet associated with this finding.',
          'Consult the official documentation link below for exact rule specifications.',
          'Update the offending element\'s HTML attributes or styles to comply with WCAG 2.1 AA.',
        ],
        codeExample: snippet
          ? {
              before: snippet.slice(0, 150),
              after: `<!-- Update element attributes to conform with ${ruleId} -->`,
              explanation: `Update the offending attributes on the element according to the ${ruleId} specification.`,
            }
          : undefined,
        furtherGuidance: {
          simplerExplanation:
            'This element does not meet standard web accessibility guidelines. Following accessibility rules ensures everyone can use your website smoothly.',
        },
        helpUrl,
      };
    }
  }
}

