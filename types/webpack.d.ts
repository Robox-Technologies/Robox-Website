export type TemplatePage = {
    import: string; // Path to the template file
    filename: string; // Output filename
    data?: TemplateData; // Data to be passed to the template
}
export type TemplateData = {
    [key: string]: any; // Key-value pairs for template data
}