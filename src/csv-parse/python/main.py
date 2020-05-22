import csv
file = '../../../data/2020-05-21/source/dataInput.csv'
with open(file, 'r', encoding='latin-1') as fh:
    reader = csv.reader(fh, delimiter=",")
    for i, line in enumerate(reader):
        # print('line[{}] = {}'.format(i, line))
        pass