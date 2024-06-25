/*
 @author: William J. Horn
 @desc:
  Assist processing shipstation orders by mapping product type to total quantity of
  that product type. Shipping and handling computation is also done automatically by accessing
  the estimated shipping cost from shipstation and adding every individual handling cost of each
  product to that value.

  todo:
    - Add algorithm for automatic package configuration 
*/

// Enums
const ProductType = {
  Jar: {
    name: 'Jar',
    caseName: 'Jar Cases',
    singleName: 'Jars',
    unit: 6,
    slotSpace: [1],
  },

  Mini: {
    name: 'Mini',
    caseName: 'Mini Case',
    singleName: 'Minis',
    unit: 6,
    slotSpace: [2, 0.5]
  },

  Bar: {
    name: 'Bar',
    caseName: 'Bar Case',
    singleName: 'Mini Case',
    unit: 12,
    slotSpace: [0.5],
  },

  NotFound: {
    name: 'NotFound',
    caseName: 'Not Found',
    singleName: 'Not Found',
    unit: 1,
    slotSpace: [0],
  }
}

/*
  @function: getNumberComponents()
  @desc: Parses a float for it's whole number and fraction counterpart, separately.
  @param: number<float>
  @return: numberComponents<Object>
    - whole<int>
    - remaining<float>
*/
const getNumberComponents = (number, scaleRemainer) => {
  const whole = Math.trunc(number);
  let remaining = Math.abs(number) - whole;

  if (typeof(scaleRemainer) === 'number') {
    remaining *= scaleRemainer;
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

  // if the first rate element doesn't exist, then the order has already been shipped
  if (!shippingRateLabel) {
    shippingRateLabel = document.querySelector('p[aria-describedby="rate-card-label-cost"]')

    // use substring on existing rate value due to dollar sign in the string
    // for ex the textContent looks like: '$10.34'
    shippingRate = Number(shippingRateLabel.textContent.substring(1));

  // otherwise, grab the existing shipping cost
  } else {
    shippingRate = Number(shippingRateLabel.textContent);
  }

  if (typeof(shippingRate) !== 'number') {
    shippingRate = 'Not Found';
  }

  // product list mapping product type to total quantity
  /*
    products = {
      [Jar]: {
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
    const productValue = Number(itemQuant.textContent);

    // exclude any invalid product types from the final product output
    // if (productType === ProductType.NotFound) {
    //   continue;
    // };

    // beyond this point, itemValue is a valid number
    if (typeof(productValue) !== 'number') throw Error('ItemValue could not be converted to a number');

    let productQuant = products[productType.name];

    // create the product data if not exists
    if (typeof(productQuant) !== 'object') {
      products[productType.name] = {
        caseAmount: 0,
        remaining: 0,
        original: 0,
      };

      productQuant = products[productType.name];
    }

    // increase the count of the product quantity
    productQuant.original += productValue;
  };


  // convert product quantities to product case amount and product remaining
  for (const key in products) {
    const productQuant = products[key];

    switch (key) {
      case ProductType.Jar:
        let quant = getNumberComponents(productQuant.original/ProductType.Jar.unit, ProductType.Jar.unit);
        productQuant.caseAmount = quant.whole;
        productQuant.remaining = quant.remaining;
        console.log('quant: ', quant);
        break;

      case ProductType.Mini:
        quant = getNumberComponents(productQuant.original/(ProductType.Mini.unit*2), ProductType.Mini.unit);
        productQuant.caseAmount = quant.whole;
        productQuant.remaining = quant.remaining;
        break;

      case ProductType.Bar:
        quant = getNumberComponents(productQuant.original/ProductType.Bar.unit, ProductType.Bar.unit);
        productQuant.caseAmount = quant.whole;
        productQuant.remaining = quant.remaining;
        break;

      case ProductType.NotFound:
        quant = getNumberComponents(productQuant.original/ProductType.NotFound.unit);
        productQuant.caseAmount = quant.whole;
        productQuant.remaining = quant.remaining;
        break;
    }
  };

  return {
    products,
    shippingRate,
  };
};
 