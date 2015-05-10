var jsdom= require('jsdom'),
    fs= require('fs');

function assert(expr, message)
{
    if(expr)
    {
        return;
    }
    throw new Error(message || '<no description given>');
}

jsdom.env(
    './jls-19.html',
    [],
    [],
    function(errors, window){
        if(errors)
        {
            throw errors;
        }

        var $= require('jquery')(window),
            _= require('underscore'),
            rules= [];

        $('div.productionset').each(function(index, element){
            var $e= $(element);

            $e.find('div.productionrecap').each(function(index, element){
                var $e= $(element),
                    $lhs= $e.find('div.production > div.lhs'),
                    $rhs= $e.find('div.production > div.rhs'),
                    rule= {};

                rule.name= $lhs.text().replace(/:$/, '');
                rule.alternatives= [];

                if($rhs.text().match('(one of)'))
                {
                    _.each($rhs.text().replace('(one of)', '').trim().split(/\s+/), function(element){
                        if(element === 'Annotation')
                        {
                            rule.alternatives.push({
                                "kind": "reference",
                                "value": element
                            });
                        }
                        else
                        {
                            rule.alternatives.push({
                                "kind": "literal",
                                "value": element
                            });
                        }
                    });
                    rules.push(rule);
                    return true;
                }
                else if(rule.name === 'Identifier' || rule.name === 'IdentifierChars' || rule.name === 'JavaLetter' || rule.name === 'JavaLetterOrDigit')
                {
                    rule.alternatives.push({
                        "kind": "-",
                        "value": $rhs.text().trim().replace(/\s+/g, ' ')
                    });
                    rules.push(rule);
                    return true;
                }

                _.each($rhs.html().replace(/(\[|\]|\{|\})/g, '<span>$1</span>').split(/\<br\s*\/?\s*\>/i), function(element, index, list){
                    var $e= $('<div class="dummy">' + element + '</div>'),
                        alternative= [],
                        stack= [],
                        zero_or_more,
                        zero_or_one;

                    $e.children().each(function(index, element){
                        var $e= $(element);

                        if($e.html() === $e.text() && $e.html() === '{')
                        {
                            stack.push(alternative);
                            alternative= [];
                        }
                        else if($e.html() === $e.text() && $e.html() === '}')
                        {
                            zero_or_more= {
                                "kind": '*',
                                "value": alternative
                            };
                            alternative= stack.pop();
                            alternative.push(zero_or_more);
                        }
                        else if($e.html() === $e.text() && $e.html() === '[')
                        {
                            stack.push(alternative);
                            alternative= [];
                        }
                        else if($e.html() === $e.text() && $e.html() === ']')
                        {
                            zero_or_one= {
                                "kind": '?',
                                "value": alternative
                            };
                            alternative= stack.pop();
                            alternative.push(zero_or_one);
                        }
                        else if($e.is('code.literal'))
                        {
                            alternative.push({
                                "kind": "literal",
                                "value": $e.text()
                            });
                        }
                        else
                        {
                            alternative.push({
                                "kind": "reference",
                                "value": $e.text()
                            });
                        }
                    });
                    assert(_.isEmpty(stack));

                    // jls doesn't contain empty alternative
                    if(!_.isEmpty(alternative))
                    {
                        rule.alternatives.push(alternative);
                    }
                });

                rules.push(rule);
            });
        });

        fs.writeFileSync('jls.json', JSON.stringify(rules, null, '    '));
    }
);
