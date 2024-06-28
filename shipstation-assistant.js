/*
 @author: William J. Horn
 @desc:
  Assist processing shipstation orders by mapping product type to total quantity of
  that product type. Shipping and handling computation is also done automatically by accessing
  the estimated shipping cost from shipstation and adding every individual handling cost of each
  product to that value.

  ? to-do:
    * Add algorithm for automatic package configuration 
    * Add support for sample jars when it comes to calculating handling cost
*/

// Enums
const ProductType = {
  Jar: {
    handlingCost: 0.5,
    caseWeight: 8.15,
    singleWeight: 1.38,
    name: 'Jar',
    unit: 6,
    slotSpace: [1],
  },

  Mini: {
    handlingCost: 1,
    caseWeight: 6,
    singleWeight: 0.5,
    name: 'Mini',
    unit: 12,
    slotSpace: [2, 0.5]
  },

  Bar: {
    caseWeight: 2,
    singleWeight: 0.167,
    handlingCost: 0.5,
    weight: 1.8,
    name: 'Bar',
    unit: 12,
    slotSpace: [0.5],
  },

  NotFound: {
    handlingCost: 0,
    weight: 0,
    name: 'NotFound',
    unit: 1,
    slotSpace: [0],
  }
}

const createUI = () => {
  const createDraggable = (element, target) => {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    element.onmousedown = dragMouseDown;
  
    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();

      if (e.target !== element) return;

      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }
  
    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();

      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      target.style.top = (target.offsetTop - pos2) + "px";
      target.style.left = (target.offsetLeft - pos1) + "px";
    }
  
    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  document.head.innerHTML += `
    <style>
      :root {
        --bg-color-primary: #1b1b21;
        --bg-color-secondary: #141418;

        --text-color-normal: #e3e6e8;
        --text-color-normal-pop: white;
        --text-color-mute: #585963;

        --outer-frame-height__SA103: 300px;
        --toolbar-height: 18px;
      }

      .outer-frame {
        box-shadow: 0 0 10px black;
        background-color: var(--bg-color-primary);
        position: fixed;
        right: 10px;
        top: 10px;
        width: 200px;
        height: var(--outer-frame-height__SA103);
        z-index: 99999;
      }

      .outer-frame * {
        padding: 0;
        margin: 0;
        box-sizing: content-box;

        font-family: monospace;
      }

      .inner-frame {
        padding: 5px;
        height: calc(100% - 34px);
        overflow-y: auto;
      }

      .inner-frame > * {
        margin-bottom: 0.7rem;
      }

      .toolbar {
        background-color: var(--bg-color-secondary);
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
      }

      .toolbar > * {
        font-weight: 600;
        background-color: red;
        width: 18px;
        height: 18px;
      }

      .body-content > * {
        margin-bottom: 0.4rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }

      .summary-container {
        background-color: var(--bg-color-secondary);
        padding-top: 1rem;
        padding-bottom: 1rem;
        padding-inline: 1.5rem;
      }

      .summary-container > * {
        margin-bottom: 0.3rem;
      }

      .compute-order-button {
        margin-inline: auto;
        text-align: center;
        background-color: green;
      }

      .heading-primary,
      .heading-secondary {
        font-size: 1rem;
        font-weight: 400;
        color: var(--text-color-normal-pop);
        text-align: center;
      }
      
      .heading-secondary {
        font-size: 0.8rem;
      }
      
      .text-primary {
        font-size: 0.7rem;
        color: var(--text-color-normal);
        text-align: center;
      }
      
      .info-item {
        padding: 0.3rem;
        font-size: 1rem;
      }
      
      .dollar-value {
        color: #72f772;
      }
      
      .quantity-value {
        color: orange;
      }
      
      .weight-value {
        color: #ffbdf4;
      }
      
      .text-left {
        text-align: left;
      }
      
      .text-right {
        text-align: right;
      }
      
      .text-mute {
        color: var(--text-color-mute);
      }
    </style>
  `;

  // master frame
  const outerFrame = document.createElement('div');
  outerFrame.classList = 'outer-frame';
  document.body.appendChild(outerFrame);

  // toolbar 
  const toolbar = document.createElement('div');
  toolbar.classList = 'toolbar';
  outerFrame.appendChild(toolbar);
  createDraggable(toolbar, outerFrame);

  const hide = document.createElement('button');
  hide.textContent = 'H';
  hide.classList = 'text-primary';
  hide.style.backgroundColor = '#4d4677';
  toolbar.appendChild(hide);

  const close = document.createElement('button');
  close.textContent = 'X';
  close.classList = 'text-primary';
  toolbar.appendChild(close);

  // inner frame
  const innerFrame = document.createElement('div');
  innerFrame.classList = 'inner-frame';
  outerFrame.appendChild(innerFrame);

  // header
  const header = document.createElement('header');
  header.classList = 'header__container';
  innerFrame.appendChild(header);

  const headerContent = document.createElement('div');
  headerContent.classList = 'header__content';
  header.appendChild(headerContent);

  const title = document.createElement('h2');
  title.classList = 'heading-primary';
  title.textContent = 'Shipstation Assistant';
  title.style.color = '#afdaff';
  title.style.fontWeight = '600';
  headerContent.appendChild(title);

  const credits = document.createElement('p');
  credits.classList = 'text-primary text-mute';
  credits.textContent = 'By: Willbur';
  headerContent.appendChild(credits);

  // UI main body content
  const bodyContent = document.createElement('div');
  bodyContent.classList = 'body-content';
  innerFrame.appendChild(bodyContent);

  const computeOrderButton = document.createElement('button');
  computeOrderButton.textContent = 'Process Order';
  computeOrderButton.classList = 'compute-order-button';
  bodyContent.appendChild(computeOrderButton);

  const orderTitle = document.createElement('h2');
  orderTitle.classList = 'heading-primary';
  orderTitle.textContent = 'Order: ';
  bodyContent.appendChild(orderTitle);

  const summaryContainer = document.createElement('div');
  summaryContainer.classList = 'summary-container';
  bodyContent.appendChild(summaryContainer);

  const jarAmountLabel = document.createElement('p');
  jarAmountLabel.classList = 'text-primary';
  jarAmountLabel.textContent = 'Jars: ';
  summaryContainer.appendChild(jarAmountLabel);

  const jarAmountValue = document.createElement('span');
  jarAmountValue.textContent = '0';
  jarAmountValue.classList = 'quantity-value';
  jarAmountLabel.appendChild(jarAmountValue);

  const barAmountLabel = document.createElement('p');
  barAmountLabel.classList = 'text-primary';
  barAmountLabel.textContent = 'Bars: ';
  summaryContainer.appendChild(barAmountLabel);

  const barAmountValue = document.createElement('span');
  barAmountValue.textContent = '0';
  barAmountValue.classList = 'quantity-value';
  barAmountLabel.appendChild(barAmountValue);

  const miniAmountLabel = document.createElement('p');
  miniAmountLabel.classList = 'text-primary';
  miniAmountLabel.textContent = 'Minis: ';
  summaryContainer.appendChild(miniAmountLabel);

  const miniAmountValue = document.createElement('span');
  miniAmountValue.textContent = '0';
  miniAmountValue.classList = 'quantity-value';
  miniAmountLabel.appendChild(miniAmountValue);

  const shippingRateLabel = document.createElement('p');
  shippingRateLabel.classList = 'text-primary';
  shippingRateLabel.style.marginTop = '0.4rem';
  shippingRateLabel.textContent = 'Shipping & Handling: ';
  summaryContainer.appendChild(shippingRateLabel);

  const shippingRateValue = document.createElement('span');
  shippingRateValue.textContent = '$0.00';
  shippingRateValue.classList = 'dollar-value';
  shippingRateLabel.appendChild(shippingRateValue);

  // logic
  close.addEventListener('click', () => {
    outerFrame.remove();
  });

  let hidden = false;
  hide.addEventListener('click', () => {
    const root = document.querySelector(':root');

    if (!hidden) {
      innerFrame.style.display = 'none';
      root.style.setProperty('--outer-frame-height__SA103', '18px');
    } else {
      innerFrame.style.display = 'block';
      root.style.setProperty('--outer-frame-height__SA103', '300px');
    }
    hidden = !hidden;
  });

  computeOrderButton.addEventListener('click', () => {
    const {
      products,
      shippingRate,
      totalWeight
    } = parseItems();

    jarAmountValue.textContent = products.Jar.caseAmount;
    if (products.Jar.remaining > 0) jarAmountValue.textContent += ` (+${products.Jar.remaining})`;

    barAmountValue.textContent = products.Bar.caseAmount;
    if (products.Bar.remaining > 0) barAmountValue.textContent += ` (+${products.Bar.remaining})`;

    miniAmountValue.textContent = products.Mini.caseAmount;
    if (products.Mini.remaining > 0) miniAmountValue.textContent += ` (+${products.Mini.remaining})`;

    shippingRateValue.textContent = '$' + shippingRate;
  });
}


/*
  @function: getNumberComponents()
  @desc: Parses a float for it's whole number and fraction counterpart, separately.
  @param: number<float>
  @return: numberComponents<Object>
    - whole<int>
    - remaining<float>
*/
const getNumberComponents = (number, scaleRemainder) => {
  const whole = Math.trunc(number);
  let remaining = Math.abs(number) - whole;

  /*
   ! issue: 
   In cases where we have a repeating decimal as a result from the division,
   for example: 4/12 (0.3333...), subtracting the whole number part from that
   will cause weird rounding logic where 4/12 won't equal a full third.
  */
  if (typeof(scaleRemainder) === 'number') {
   // this is a temporary fix
    remaining = Math.floor(remaining*scaleRemainder + 0.0001);
  }

  return {
    whole,
    remaining
  }
}

/*
  @function: getProductType()
  @desc: Parses the raw input string of a product SKU and returns what type of product it is.
  @param: rawString<string>
  @return: productType<string>
*/
const getProductType = (rawString) => {
  if (rawString.match('13OZ')) return ProductType.Jar;
  if (rawString.match('MINI')) return ProductType.Mini;
  if (rawString.match('BAR')) return ProductType.Bar;

  return ProductType.NotFound;
};
 
/*
  @function: parseItems()
  @desc: Parses the shipstation HTML
*/
const parseItems = () => {

  // outer HTML of shipstation order list
  const outerList = document.querySelector('.react-table-wrapper-uZ_76Y3');
  const innerList = outerList.querySelector('div[role="rowgroup"]');
  const itemList = innerList.querySelectorAll('.react-table-body-row-icH4FVD'); // querySelectorAll for items array

  // shipstation rate estimate element & rate value (shipping & handling)
  let shippingRateLabel = document.querySelector('.rate-amount-R6LSuka');
  let shippingRate = 0;
  let totalWeight = 0;

  // if the first rate element doesn't exist, then the order has already been shipped
  if (!shippingRateLabel) {
    shippingRateLabel = document.querySelector('p[aria-describedby="rate-card-label-cost"]')

    // if no shipping rate label exists at all then error
    if (!shippingRateLabel) throw Error('Could not find ShippingRateLabel element');
  }

  // use substring on existing rate value due to dollar sign in the string
  // for ex the textContent looks like: '$10.34'
  shippingRate = Number(shippingRateLabel.textContent.substring(1));

  if (typeof(shippingRate) !== 'number') {
    shippingRate = 'Not Found';
  }

  // product list mapping product type to total quantity
  /*
    products = {
      'Jar': {
        caseAmount: 3,
        remaining: 4
      }
    }
  */
  const products = {};

  // iterate through the element item list and parse HTML for relevant product data
  for (const item of itemList) {

    // item label and quantity elements
    const itemLabel = item.querySelector('.item-sku-ONq0BTI'); 
    const itemQuant = item.querySelector('.quantity-text-UmGFNkF'); 

    // beyond this point, itemLabel and itemQuant exists
    if (!itemLabel || !itemQuant) throw Error('ItemLabel or ItemQuantity element does not exist');

    // get the product type
    const productType = getProductType(itemLabel.textContent);
    const productQuantity = Number(itemQuant.textContent);

    // exclude any invalid product types from the final product output
    // if (productType === ProductType.NotFound) {
    //   continue;
    // };

    // beyond this point, itemValue is a valid number
    if (typeof(productQuantity) !== 'number') throw Error('ProductQuantity could not be converted to a number');

    let productQuant = products[productType.name];

    // create the product data if not exists
    if (typeof(productQuant) !== 'object') {
      products[productType.name] = {
        caseAmount: 0,
        remaining: 0,
        original: 0,
        handlingCost: 0,
        type: productType,
      };

      productQuant = products[productType.name];
    }

    // increase the count of the product quantity
    productQuant.original += productQuantity;
  };


  // convert product quantities to product case amount and product remaining
  for (const productName in products) {
    const productQuant = products[productName];
    const productType = productQuant.type;

    let quant = getNumberComponents(productQuant.original/productType.unit, productType.unit);

    //* note: handling cost currently does not account for remaining 6-pack mini jars
    productQuant.caseAmount = quant.whole;
    productQuant.remaining = quant.remaining;
    productQuant.handlingCost = productType.handlingCost*productQuant.caseAmount;
    shippingRate += productQuant.handlingCost;
    totalWeight += productQuant.caseAmount*productType.caseWeight + productQuant.remaining*productType.singleWeight;
  };

  return {
    products,
    shippingRate,
    totalWeight,
  };
};

createUI()