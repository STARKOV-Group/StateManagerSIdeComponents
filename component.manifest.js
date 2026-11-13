module.exports = {
  vendorName: 'Directum',
  componentName: 'CriteriaControl',
  componentVersion: '1.1',
  // Описание контролов, которые есть в компоненте. Реализация контролов находится в папке ./src/controls.
  controls: [
    {
      name: 'Criteria',
      loaders: [
        {
          name: 'Criteria',
          scope: 'Card'
        }
      ],
      displayNames: [
        { locale: 'en', name: 'Criteria' },
        { locale: 'ru', name: 'Критерии' },
      ]
    },
    {
      name: 'DisplayNameControl',
      loaders: [
        {
          name: 'DisplayNameControl',
          scope: 'Card'
        }
      ],
      displayNames: [
        { locale: 'en', name: 'DisplayNameControl' },
        { locale: 'ru', name: 'Отображаемое имя свойства' },
      ]
    }
  ]
};