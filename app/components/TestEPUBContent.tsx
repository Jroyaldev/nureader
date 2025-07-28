'use client';

// Test component to generate sample EPUB content for testing
export const generateTestChapters = () => {
  const chapters = [];
  
  // Add edge case chapters first
  chapters.push({
    id: 'chapter-empty',
    href: 'empty.xhtml',
    title: 'Empty Chapter',
    subtitle: 'Testing empty content handling',
    level: 1,
    content: '',
    wordCount: 0,
    estimatedReadTime: 0
  });
  
  chapters.push({
    id: 'chapter-minimal',
    href: 'minimal.xhtml',
    title: 'Minimal Chapter',
    subtitle: 'Testing minimal content',
    level: 1,
    content: '<p>Single paragraph.</p>',
    wordCount: 2,
    estimatedReadTime: 1
  });
  
  chapters.push({
    id: 'chapter-images',
    href: 'images.xhtml',
    title: 'Image Chapter',
    subtitle: 'Testing image handling',
    level: 1,
    content: `
      <h1>Chapter with Images</h1>
      <p>This chapter tests image handling and layout.</p>
      <img src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='100%' height='100%' fill='%23ddd'/><text x='50%' y='50%' text-anchor='middle' dy='.3em'>Test Image</text></svg>" alt="Test Image" />
      <p>Text after image should layout correctly.</p>
    `,
    wordCount: 15,
    estimatedReadTime: 1
  });
  
  for (let i = 1; i <= 5; i++) {
    chapters.push({
      id: `chapter-${i}`,
      href: `chapter${i}.xhtml`,
      title: `Chapter ${i}: Test Chapter`,
      subtitle: `Testing reading experience`,
      level: 1,
      content: `
        <h1>Chapter ${i}: Premium Reading Experience Test</h1>
        
        <p>This is a test chapter designed to verify the premium reading experience 
        in nuReader. This paragraph contains enough text to test various features including 
        fullscreen mode, page navigation, and touch interactions.</p>
        
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
        quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo 
        consequat.</p>
        
        <blockquote>
          "The best way to test a reading application is to actually read in it. 
          This quote tests the blockquote styling and formatting."
        </blockquote>
        
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum 
        dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non 
        proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        
        <h2>Testing Multiple Pages</h2>
        
        <p>This section contains additional content to ensure we have enough text 
        to test page navigation. The page turn functionality should work smoothly 
        without requiring double clicks.</p>
        
        ${Array(10).fill(0).map((_, j) => `
          <p>Paragraph ${j + 1} of extended content. Sed ut perspiciatis unde omnis 
          iste natus error sit voluptatem accusantium doloremque laudantium, totam 
          rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi 
          architecto beatae vitae dicta sunt explicabo.</p>
        `).join('')}
        
        <h2>Testing Fullscreen Mode</h2>
        
        <p>When entering fullscreen mode, all text should remain visible and properly 
        formatted. The reading experience should be seamless across all display modes.</p>
        
        <p>Additional content to ensure we have multiple pages per chapter for thorough 
        testing of the navigation system.</p>
      `,
      wordCount: 500 + (i * 100),
      estimatedReadTime: 2 + i
    });
  }
  
  return chapters;
};

export const TestEPUBContent = () => {
  return null; // This is just a utility component
};