# Equivalências de abreviações e números para transcrição

# Lista de abreviações comuns e equivalências
ABBREVIATION_EQUIVALENTS = {
    # Verbos to be
    "am": ["am", "'m"],
    "are": ["are", "'re"],
    "is": ["is", "'s"],
    "have": ["have", "'ve"],
    "has": ["has", "'s"],
    "had": ["had", "'d"],
    "will": ["will", "'ll"],
    "would": ["would", "'d"],
    "not": ["not", "n't"],
    "shall": ["shall", "'ll"],
    "us": ["us", "'s"],
    "I am": ["I'm", "I am"],
    "you are": ["you're", "you are"],
    "he is": ["he's", "he is"],
    "she is": ["she's", "she is"],
    "it is": ["it's", "it is"],
    "we are": ["we're", "we are"],
    "they are": ["they're", "they are"],
    "I have": ["I've", "I have"],
    "you have": ["you've", "you have"],
    "we have": ["we've", "we have"],
    "they have": ["they've", "they have"],
    "I will": ["I'll", "I will"],
    "you will": ["you'll", "you will"],
    "he will": ["he'll", "he will"],
    "she will": ["she'll", "she will"],
    "it will": ["it'll", "it will"],
    "we will": ["we'll", "we will"],
    "they will": ["they'll", "they will"],
    "cannot": ["cannot", "can't"],
    "will not": ["won't", "will not"],
    "would not": ["wouldn't", "would not"],
    "should not": ["shouldn't", "should not"],
    "could not": ["couldn't", "could not"],
    "did not": ["didn't", "did not"],
    "does not": ["doesn't", "does not"],
    "do not": ["don't", "do not"],
    "has not": ["hasn't", "has not"],
    "had not": ["hadn't", "had not"],
    "is not": ["isn't", "is not"],
    "are not": ["aren't", "are not"],
    "was not": ["wasn't", "was not"],
    "were not": ["weren't", "were not"],
    # Adicione outras abreviações conforme necessário
}

# Números de 1 a 100, digitados e por extenso
NUMBERS_EQUIVALENTS = {}
number_words = [
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
    "twenty-one", "twenty-two", "twenty-three", "twenty-four", "twenty-five", "twenty-six", "twenty-seven", "twenty-eight", "twenty-nine", "thirty",
    "thirty-one", "thirty-two", "thirty-three", "thirty-four", "thirty-five", "thirty-six", "thirty-seven", "thirty-eight", "thirty-nine", "forty",
    "forty-one", "forty-two", "forty-three", "forty-four", "forty-five", "forty-six", "forty-seven", "forty-eight", "forty-nine", "fifty",
    "fifty-one", "fifty-two", "fifty-three", "fifty-four", "fifty-five", "fifty-six", "fifty-seven", "fifty-eight", "fifty-nine", "sixty",
    "sixty-one", "sixty-two", "sixty-three", "sixty-four", "sixty-five", "sixty-six", "sixty-seven", "sixty-eight", "sixty-nine", "seventy",
    "seventy-one", "seventy-two", "seventy-three", "seventy-four", "seventy-five", "seventy-six", "seventy-seven", "seventy-eight", "seventy-nine", "eighty",
    "eighty-one", "eighty-two", "eighty-three", "eighty-four", "eighty-five", "eighty-six", "eighty-seven", "eighty-eight", "eighty-nine", "ninety",
    "ninety-one", "ninety-two", "ninety-three", "ninety-four", "ninety-five", "ninety-six", "ninety-seven", "ninety-eight", "ninety-nine", "one hundred"
]
for i in range(1, 101):
    NUMBERS_EQUIVALENTS[str(i)] = [str(i), number_words[i-1]]
    NUMBERS_EQUIVALENTS[number_words[i-1]] = [str(i), number_words[i-1]]


def are_equivalent(word1: str, word2: str) -> bool:
    """
    Retorna True se word1 e word2 forem equivalentes considerando abreviações e números.
    """
    w1 = word1.lower()
    w2 = word2.lower()
    # Abreviações
    for group in ABBREVIATION_EQUIVALENTS.values():
        if w1 in group and w2 in group:
            return True
    # Números
    if w1 in NUMBERS_EQUIVALENTS and w2 in NUMBERS_EQUIVALENTS[w1]:
        return True
    if w2 in NUMBERS_EQUIVALENTS and w1 in NUMBERS_EQUIVALENTS[w2]:
        return True
    # Igualdade direta
    return w1 == w2 